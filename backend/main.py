"""Clausewise API: reads a legal document, checks it against a rulebook for its type, answers questions by voice."""

import asyncio
import copy
import hashlib
import json
import logging
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

import demo_data  # noqa: E402
import gemma  # noqa: E402
import history  # noqa: E402
import prompts  # noqa: E402
import sarvam  # noqa: E402

log = logging.getLogger("clausewise")
HERE = Path(__file__).parent
RULEBOOKS = {
    p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted((HERE / "rulebooks").glob("*.json"))
}
SAMPLES = json.loads((HERE / "samples" / "index.json").read_text(encoding="utf-8"))
SAMPLE_TEXT = {s["id"]: (HERE / "samples" / f"{s['id']}.txt").read_text(encoding="utf-8") for s in SAMPLES}
CACHE_DIR = HERE / "cache"
CACHE_DIR.mkdir(exist_ok=True)
LIVE_TIMEOUT = 30  # seconds to wait for Gemma on Q&A and negotiation before falling back

app = FastAPI(title="Clausewise")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------

def rulebook_for(doc_type: str | None) -> dict:
    return RULEBOOKS.get(doc_type or "", RULEBOOKS["general"])


def _rules_for_prompt(book: dict) -> str:
    return json.dumps([{k: r[k] for k in ("id", "title", "benchmark", "flag")} for r in book["rules"]], ensure_ascii=False)


def _clauses_for_prompt(clauses: list[dict]) -> str:
    return json.dumps([{k: c.get(k) for k in ("id", "number", "category", "text")} for c in clauses], ensure_ascii=False)


def _tidy(title: str) -> str:
    # Gemma sometimes copies headings in capitals; show them in Title Case.
    return title.title() if title.isupper() else title


def with_meta(result: dict, sample_id: str | None = None) -> dict:
    """Attach the document type, parties and rulebook, filling them in for analyses cached before they existed."""
    book = rulebook_for(result.get("doc_type") or "rent")
    out = {
        **result,
        "doc_type": book["type"],
        "doc_label": book["label"],
        "parties": book["parties"],
        "rules": book["rules"],
        "rules_source": book["source"],
        "key_facts": result.get("key_facts") or [],
        "sample": sample_id is not None,
        "sample_id": sample_id,
    }
    out["title"] = _tidy(out.get("title") or book["label"])
    for c in out.get("clauses", []):
        c["title"] = _tidy(c.get("title", ""))
    return out


def build_analysis(extraction: dict, fairness: dict, source: str, book: dict) -> dict:
    """Merge Gemma's two outputs, drop citations that aren't in the rulebook, score, and build the reasoning trace."""
    rules = {r["id"]: r for r in book["rules"]}
    checklist = {c["category"]: c["label"] for c in book["checklist"]}
    clauses = extraction.get("clauses", [])
    flags = {f.get("clause_id"): f for f in fairness.get("flags", [])}
    dropped = 0
    for c in clauses:
        f = flags.get(c["id"], {})
        rule_id = f.get("rule_id")
        if rule_id and rule_id not in rules:
            dropped += 1
            rule_id = None
        severity = f.get("severity", "green")
        if severity not in ("red", "amber", "green"):
            severity = "green"
        c.update(severity=severity, rule_id=rule_id, reason=f.get("reason", ""))

    missing = [
        {"category": m["category"], "label": checklist.get(m["category"], m["category"].replace("_", " ").title()), "why": m.get("why", "")}
        for m in fairness.get("missing", [])
        if m.get("category")
    ]
    comparisons = [
        c for c in fairness.get("comparisons", [])
        if isinstance(c.get("yours"), (int, float)) and isinstance(c.get("benchmark"), (int, float))
        and (c.get("rule_id") in rules or c.get("rule_id") is None)
    ][:4]

    counts = {s: sum(1 for c in clauses if c["severity"] == s) for s in ("red", "amber", "green")}
    counts["missing"] = len(missing)
    total = max(len(clauses), 1)
    score = round(100 * (counts["green"] + 0.5 * counts["amber"]) / total) - 3 * len(missing)
    score = max(0, min(100, score))

    kv = extraction.get("key_values", {}) or {}
    facts = extraction.get("key_facts") or []
    if kv.get("rent"):
        headline = f" Rent Rs. {kv['rent']:,}/month" + (f", deposit Rs. {kv['deposit']:,}." if kv.get("deposit") else ".")
    else:
        headline = "".join(f" {f['label']}: {f['value']}." for f in facts[:2] if f.get("label"))
    trace = [{"from": "Reader", "to": "Law Checker", "kind": "info", "text": f"Read {len(clauses)} clauses.{headline}"}]
    for c in clauses:
        if c["severity"] != "green":
            rule = rules.get(c["rule_id"], {})
            trace.append({
                "from": "Law Checker", "to": "You", "kind": c["severity"],
                "clause_id": c["id"], "rule_id": c["rule_id"],
                "text": f"Clause {c.get('number', c['id'])} vs {c['rule_id'] or 'common practice'}"
                + (f" ({rule['title']})" if rule else "") + f": {c['reason']}",
            })
    if missing:
        trace.append({"from": "Gap Finder", "to": "You", "kind": "missing",
                      "text": "Not in your document: " + ", ".join(m["label"] for m in missing) + "."})
    cited = sum(1 for c in clauses if c["rule_id"])
    trace.append({"from": "Verifier", "to": "You", "kind": "verify",
                  "text": f"Checked {cited + dropped} rule citations against the rulebook"
                  + (f"; removed {dropped} that did not exist." if dropped else "; all are real rules.")})

    return {
        "source": source,
        "doc_type": book["type"],
        "title": extraction.get("title") or book["label"],
        "clauses": clauses,
        "key_values": kv if book["type"] == "rent" else {},
        "key_facts": facts[:6],
        "missing": missing,
        "comparisons": comparisons,
        "counts": counts,
        "score": score,
        "trace": trace,
    }


def sample_fallback(sample_id: str, notice: str | None = None) -> dict:
    """A ready-made analysis for a sample: the hand-checked rent demo, or a saved Gemma 4 run for the others."""
    if sample_id == "rent":
        result = build_analysis(copy.deepcopy(demo_data.EXTRACTION), copy.deepcopy(demo_data.FAIRNESS), "demo", RULEBOOKS["rent"])
    else:
        saved = HERE / "samples" / f"{sample_id}.analysis.json"
        if not saved.exists():
            raise HTTPException(503, "No saved analysis for this sample; add GEMINI_API_KEY to analyse it live.")
        result = {**json.loads(saved.read_text(encoding="utf-8")), "source": "demo"}
    result = with_meta(result, sample_id)
    if notice:
        result["notice"] = notice
    return result


async def gemma_analysis(image: bytes | None, mime: str, text: str | None, doc_type: str | None) -> dict:
    prompt = prompts.EXTRACT + (f"\n\nDOCUMENT TEXT:\n{text}" if text else "")
    extraction = await gemma.generate_json(prompt, image=image, mime=mime)
    book = rulebook_for(doc_type or extraction.get("doc_type"))
    fairness = await gemma.generate_json(prompts.FAIRNESS.format(
        doc_label=book["label"].lower(),
        you=book["parties"]["you"].lower(),
        clauses=_clauses_for_prompt(extraction.get("clauses", [])),
        rules=_rules_for_prompt(book),
        checklist=json.dumps(book["checklist"]),
    ))
    return build_analysis(extraction, fairness, "gemma", book)


async def speak(text: str, lang: str) -> str | None:
    if not sarvam.enabled():
        return None
    try:
        return await sarvam.text_to_speech(text, lang)
    except Exception as e:  # voice is a nice-to-have; the browser falls back to its own speech
        log.warning("TTS failed: %s", e)
        return None


async def live_or_none(call):
    """Run a Gemma call, but give up after LIVE_TIMEOUT seconds so a slow free-tier response can't stall the demo."""
    try:
        return await asyncio.wait_for(call, LIVE_TIMEOUT)
    except Exception as e:
        log.warning("Gemma call failed or timed out, using fallback: %s", type(e).__name__)
        return None


async def in_language(text_en: str, lang: str, hindi: str | None = None) -> tuple[str, str]:
    """Return (text, language_code): a ready Hindi version if given, else a Sarvam translation, else English."""
    if lang.startswith("hi") and hindi:
        return hindi, "hi-IN"
    if sarvam.enabled() and not lang.startswith("en"):
        return await sarvam.translate(text_en, "en-IN", lang), lang
    return text_en, "en-IN"


# ---------- routes ----------

@app.get("/api/health")
def health():
    return {"gemma": gemma.enabled(), "sarvam": sarvam.enabled(), "model": gemma._model() if gemma.enabled() else None}


@app.get("/api/samples")
def samples():
    return [
        {**s, "label": RULEBOOKS[s["type"]]["label"], "parties": RULEBOOKS[s["type"]]["parties"],
         "rules": len(RULEBOOKS[s["type"]]["rules"])}
        for s in SAMPLES
    ]


@app.get("/api/samples/{sample_id}")
def sample_text(sample_id: str):
    if sample_id not in SAMPLE_TEXT:
        raise HTTPException(404, "Unknown sample")
    return {"text": SAMPLE_TEXT[sample_id]}


@app.post("/api/analyze")
async def analyze(file: UploadFile | None = File(None), sample_id: str | None = Form(None)):
    image = await file.read() if file else None
    if not image:
        sample_id = sample_id if sample_id in SAMPLE_TEXT else "rent"
    else:
        sample_id = None
    text = SAMPLE_TEXT[sample_id] if sample_id else None
    sample_type = next((s["type"] for s in SAMPLES if s["id"] == sample_id), None)

    key = hashlib.sha256(image or text.encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"{key}.json"
    if cached.exists():
        return with_meta(json.loads(cached.read_text(encoding="utf-8")), sample_id)

    if not gemma.enabled():
        if sample_id:
            return sample_fallback(sample_id, "Demo mode: showing a saved analysis. Add GEMINI_API_KEY for live results.")
        return sample_fallback("rent", "Demo mode: add GEMINI_API_KEY to analyse your own document. Showing the sample agreement.")
    try:
        result = await gemma_analysis(image, file.content_type if file else "image/jpeg", text, sample_type)
    except Exception as e:
        log.exception("Gemma analysis failed")
        return sample_fallback(sample_id or "rent", f"Couldn't reach Gemma ({type(e).__name__}). Showing a saved analysis.")
    cached.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    return with_meta(result, sample_id)


@app.post("/api/voice")
async def voice(file: UploadFile = File(...)):
    if not sarvam.enabled():
        return {"error": "sarvam_disabled"}
    audio = await file.read()
    return await sarvam.speech_to_text(audio, file.filename or "question.webm", file.content_type or "audio/webm")


class AskBody(BaseModel):
    question: str
    language_code: str = "en-IN"
    analysis: dict


def demo_answer(question: str) -> dict:
    q = question.lower()
    for entry in demo_data.QA:
        if any(k in q for k in entry["keywords"]):
            return entry
    return demo_data.QA_FALLBACK


@app.post("/api/ask")
async def ask(body: AskBody):
    lang = body.language_code or "en-IN"
    analysis = body.analysis
    clauses = analysis.get("clauses", [])
    book = rulebook_for(analysis.get("doc_type") or "rent")
    rules = {r["id"] for r in book["rules"]}

    out = None
    if gemma.enabled():
        question_en = body.question
        if sarvam.enabled() and not lang.startswith("en"):
            question_en = await sarvam.translate(body.question, lang, "en-IN")
        out = await live_or_none(gemma.generate_json(prompts.ASK.format(
            you=book["parties"]["you"].lower(), doc_label=book["label"].lower(),
            clauses=_clauses_for_prompt(clauses), rules=_rules_for_prompt(book), question=question_en)))
    if out:
        answer_en = out.get("answer", "")
        answer, answer_lang = await in_language(answer_en, lang)
        clause_ids, rule_ids, confidence = out.get("clause_ids", []), out.get("rule_ids", []), out.get("confidence", "high")
    else:
        # The canned answers describe the rent sample only, so never use them for any other document.
        if analysis.get("sample_id") == "rent":
            entry = demo_answer(body.question)
        else:
            entry = demo_data.QA_RETRY if gemma.enabled() else demo_data.QA_NO_KEY
        answer_en = entry["en"]
        answer, answer_lang = await in_language(answer_en, lang, entry.get("hi"))
        clause_ids, rule_ids = entry["clause_ids"], entry["rule_ids"]
        confidence = entry["confidence"] if analysis.get("source") == "demo" else "low"

    valid_clauses = {c["id"] for c in clauses}
    return {
        "answer": answer,
        "answer_en": answer_en,
        "language_code": answer_lang,
        "clause_ids": [c for c in clause_ids if c in valid_clauses],
        "rule_ids": [r for r in rule_ids if r in rules],
        "confidence": confidence,
        "audio_base64": await speak(answer, answer_lang),
    }


class NegotiateBody(BaseModel):
    language_code: str = "en-IN"
    analysis: dict


@app.post("/api/negotiate")
async def negotiate(body: NegotiateBody):
    lang = body.language_code or "en-IN"
    analysis = body.analysis
    book = rulebook_for(analysis.get("doc_type") or "rent")
    concerns = [
        f"Clause {c.get('number')}: {c.get('reason')}"
        for c in analysis.get("clauses", []) if c.get("severity") in ("red", "amber")
    ] + [f"Missing: {m['label']}" for m in analysis.get("missing", [])]

    out = None
    if gemma.enabled():
        out = await live_or_none(gemma.generate_json(prompts.NEGOTIATE.format(
            you=book["parties"]["you"].lower(), them=book["parties"]["them"].lower(),
            doc_label=book["label"].lower(), concerns="\n".join(concerns))))
    if out and out.get("message"):
        message_en = out["message"]
        message, message_lang = await in_language(message_en, lang)
    elif analysis.get("sample_id") == "rent":
        message_en = demo_data.NEGOTIATE["en"]
        message, message_lang = await in_language(message_en, lang, demo_data.NEGOTIATE["hi"])
    else:
        # Build a plain request from the document's own flagged clauses.
        titles = [c.get("title", "").lower() for c in analysis.get("clauses", []) if c.get("severity") == "red"]
        message_en = (
            f"Namaste ji, thank you for the {book['label'].split(' / ')[0].lower()}. Before signing, could we revisit a few clauses "
            f"so they match {book['law_name']}: {', '.join(titles) or 'the terms I flagged'}? Happy to discuss. Thank you!"
        )
        message, message_lang = await in_language(message_en, lang)

    return {
        "message": message,
        "message_en": message_en,
        "language_code": message_lang,
        "whatsapp_url": "https://wa.me/?text=" + quote(message),
        "audio_base64": await speak(message, message_lang),
    }


# ---------- case history ----------

def rescore(analysis: dict) -> dict:
    """Recount verdicts and recompute the score after clauses change (same formula as build_analysis)."""
    clauses = analysis["clauses"]
    counts = {s: sum(1 for c in clauses if c["severity"] == s) for s in ("red", "amber", "green")}
    counts["missing"] = len(analysis.get("missing", []))
    score = round(100 * (counts["green"] + 0.5 * counts["amber"]) / max(len(clauses), 1)) - 3 * counts["missing"]
    return {**analysis, "counts": counts, "score": max(0, min(100, score))}


def seed_examples():
    """Two clearly-labelled example cases so the history page shows what tracking looks like."""
    def at(days):
        return history._now(-days)

    def clause_id(analysis, number):
        return next(c["id"] for c in analysis["clauses"] if str(c["number"]) == str(number))

    # Example 1: a rent agreement negotiated, revised and signed.
    rent = sample_fallback("rent")
    rent["title"] = "Example: Rental Agreement, Flat 304, Bengaluru"
    case = history.create_case(rent, example=True, when=at(9))
    history.set_status(case, "negotiating", at(8.9))
    history.add_event(case, "message_sent", "Sent the negotiation message to the landlord on WhatsApp.", when=at(8.8))
    history.add_event(case, "reply", "Landlord: “Fine on the deposit, notice for rent and entry. I want to keep the repairs clause.”", when=at(7.2))
    for number, status, note in [
        (3, "agreed", "Deposit cut to Rs. 36,000 (2 months)."),
        (5, "agreed", "Rent rises only with 3 months' written notice."),
        (10, "agreed", "Disconnection clause removed."),
        (8, "agreed", "Entry with 24 hours' notice."),
        (4, "agreed", "Itemised refund within 30 days."),
        (9, "partly", "Landlord's notice raised from 15 to 60 days."),
        (7, "refused", "Tenant still pays all repairs."),
    ]:
        history.set_outcome(case, clause_id(rent, number), status, note, "Landlord", at(7.1))
    revised = copy.deepcopy(rent)
    fixes = {
        "3": ("green", "The Tenant shall pay a refundable security deposit of Rs. 36,000 (two months' rent)."),
        "4": ("green", "The deposit shall be refunded within 30 days of handover, after itemised deductions for damage."),
        "5": ("green", "The rent may be revised once a year by up to 5%, with 3 months' written notice."),
        "8": ("green", "The Landlord may inspect the premises with 24 hours' written notice, between 9 am and 7 pm."),
        "9": ("amber", "The Landlord may terminate this agreement by giving 60 days' notice."),
        "10": ("green", "Electricity and water charges shall be paid by the Tenant as per meter readings."),
    }
    for c in revised["clauses"]:
        if str(c["number"]) in fixes:
            c["severity"], c["text"] = fixes[str(c["number"])]
            if c["severity"] == "green":
                c["reason"] = ""
    revised["missing"] = [m for m in revised["missing"] if m["category"] == "dispute_resolution"]
    history.add_version(case, rescore(revised), when=at(5))
    history.set_status(case, "signed", at(4))

    # Example 2: a job offer, mid-negotiation.
    job = sample_fallback("employment")
    job["title"] = "Example: Software Engineer Offer, Pune"
    case = history.create_case(job, example=True, when=at(3))
    history.set_status(case, "negotiating", at(2.9))
    history.add_event(case, "message_sent", "Emailed HR with the requested changes.", when=at(2.8))
    history.add_event(case, "reply", "HR: “We'll drop the non-compete and cut the bond. The notice period stays.”", when=at(1))
    for number, status, note in [
        (9, "agreed", "Non-compete removed."),
        (5, "partly", "Bond cut to Rs. 1,00,000, tied to actual training cost."),
        (6, "refused", "90-day notice period stays."),
    ]:
        history.set_outcome(case, clause_id(job, number), status, note, "Employer", at(0.9))


history.init(seed_examples)


class CaseCreate(BaseModel):
    analysis: dict


class CaseEvent(BaseModel):
    kind: str
    text: str


class CaseOutcome(BaseModel):
    status: str
    note: str = ""


class CaseStatus(BaseModel):
    status: str


def _case_or_404(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except KeyError:
        raise HTTPException(404, "Case not found")
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/cases")
def cases():
    return history.list_cases()


@app.post("/api/cases")
def create_case(body: CaseCreate):
    case_id = history.create_case(body.analysis)
    return history.get_case(case_id)


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    return _case_or_404(history.get_case, case_id)


@app.post("/api/cases/{case_id}/versions")
def add_version(case_id: str, body: CaseCreate):
    _case_or_404(history.get_case, case_id)
    return history.add_version(case_id, body.analysis)


@app.post("/api/cases/{case_id}/events")
def add_event(case_id: str, body: CaseEvent):
    _case_or_404(history.get_case, case_id)
    history.add_event(case_id, body.kind, body.text)
    return history.get_case(case_id)


@app.put("/api/cases/{case_id}/clauses/{clause_id}")
def set_outcome(case_id: str, clause_id: str, body: CaseOutcome):
    case = _case_or_404(history.get_case, case_id)
    return _case_or_404(history.set_outcome, case_id, clause_id, body.status, body.note, case["parties"].get("them", "They"))


@app.patch("/api/cases/{case_id}")
def set_status(case_id: str, body: CaseStatus):
    return _case_or_404(history.set_status, case_id, body.status)


@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str):
    history.delete_case(case_id)
    return {"ok": True}


# Serve the built frontend from the same server for the demo (npm run build in ../frontend).
DIST = HERE.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    asyncio.run(uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8000)).serve())
