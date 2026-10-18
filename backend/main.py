"""Clausewise API: reads a rent agreement, checks it against a rulebook, answers questions by voice."""

import asyncio
import hashlib
import json
import logging
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

import demo_data  # noqa: E402
import gemma  # noqa: E402
import prompts  # noqa: E402
import sarvam  # noqa: E402

log = logging.getLogger("clausewise")
HERE = Path(__file__).parent
RULEBOOK = json.loads((HERE / "rules.json").read_text(encoding="utf-8"))
RULES = {r["id"]: r for r in RULEBOOK["rules"]}
CHECKLIST = {c["category"]: c["label"] for c in RULEBOOK["checklist"]}
SAMPLE_TEXT = (HERE / "sample_agreement.txt").read_text(encoding="utf-8")
CACHE_DIR = HERE / "cache"
CACHE_DIR.mkdir(exist_ok=True)
LIVE_TIMEOUT = 30  # seconds to wait for Gemma on Q&A and negotiation before falling back

app = FastAPI(title="Clausewise")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------

def _rules_for_prompt() -> str:
    return json.dumps([{k: r[k] for k in ("id", "title", "benchmark", "flag")} for r in RULEBOOK["rules"]], ensure_ascii=False)


def _clauses_for_prompt(clauses: list[dict]) -> str:
    return json.dumps([{k: c.get(k) for k in ("id", "number", "category", "text")} for c in clauses], ensure_ascii=False)


def build_analysis(extraction: dict, fairness: dict, source: str) -> dict:
    """Merge Gemma's two outputs, drop citations that aren't in the rulebook, score, and build the reasoning trace."""
    clauses = extraction.get("clauses", [])
    flags = {f.get("clause_id"): f for f in fairness.get("flags", [])}
    dropped = 0
    for c in clauses:
        f = flags.get(c["id"], {})
        rule_id = f.get("rule_id")
        if rule_id and rule_id not in RULES:
            dropped += 1
            rule_id = None
        severity = f.get("severity", "green")
        if severity not in ("red", "amber", "green"):
            severity = "green"
        c.update(severity=severity, rule_id=rule_id, reason=f.get("reason", ""))

    missing = [
        {"category": m["category"], "label": CHECKLIST.get(m["category"], m["category"].replace("_", " ").title()), "why": m.get("why", "")}
        for m in fairness.get("missing", [])
        if m.get("category")
    ]
    comparisons = [
        c for c in fairness.get("comparisons", [])
        if isinstance(c.get("yours"), (int, float)) and isinstance(c.get("benchmark"), (int, float))
        and (c.get("rule_id") in RULES or c.get("rule_id") is None)
    ][:4]

    counts = {s: sum(1 for c in clauses if c["severity"] == s) for s in ("red", "amber", "green")}
    counts["missing"] = len(missing)
    total = max(len(clauses), 1)
    score = round(100 * (counts["green"] + 0.5 * counts["amber"]) / total) - 3 * len(missing)
    score = max(0, min(100, score))

    kv = extraction.get("key_values", {}) or {}
    trace = [{
        "from": "Reader", "to": "Law Checker", "kind": "info",
        "text": f"Read {len(clauses)} clauses."
        + (f" Rent Rs. {kv['rent']:,}/month" if kv.get("rent") else "")
        + (f", deposit Rs. {kv['deposit']:,}." if kv.get("deposit") else "."),
    }]
    for c in clauses:
        if c["severity"] != "green":
            rule = RULES.get(c["rule_id"], {})
            trace.append({
                "from": "Law Checker", "to": "You", "kind": c["severity"],
                "clause_id": c["id"], "rule_id": c["rule_id"],
                "text": f"Clause {c.get('number', c['id'])} vs {c['rule_id'] or 'common practice'}"
                + (f" ({rule['title']})" if rule else "") + f": {c['reason']}",
            })
    if missing:
        trace.append({"from": "Gap Finder", "to": "You", "kind": "missing",
                      "text": "Not in your agreement: " + ", ".join(m["label"] for m in missing) + "."})
    cited = sum(1 for c in clauses if c["rule_id"])
    trace.append({"from": "Verifier", "to": "You", "kind": "verify",
                  "text": f"Checked {cited + dropped} rule citations against the rulebook"
                  + (f"; removed {dropped} that did not exist." if dropped else "; all are real rules.")})

    return {
        "source": source,
        "title": extraction.get("title", "Rent agreement"),
        "clauses": clauses,
        "key_values": kv,
        "missing": missing,
        "comparisons": comparisons,
        "counts": counts,
        "score": score,
        "trace": trace,
        "rules": RULEBOOK["rules"],
        "rules_source": RULEBOOK["source"],
    }


def demo_analysis(notice: str | None = None) -> dict:
    import copy
    result = build_analysis(copy.deepcopy(demo_data.EXTRACTION), copy.deepcopy(demo_data.FAIRNESS), "demo")
    if notice:
        result["notice"] = notice
    return result


async def gemma_analysis(image: bytes | None, mime: str, text: str | None) -> dict:
    prompt = prompts.EXTRACT + (f"\n\nAGREEMENT TEXT:\n{text}" if text else "")
    extraction = await gemma.generate_json(prompt, image=image, mime=mime)
    fairness = await gemma.generate_json(prompts.FAIRNESS.format(
        clauses=_clauses_for_prompt(extraction.get("clauses", [])),
        rules=_rules_for_prompt(),
        checklist=json.dumps(RULEBOOK["checklist"]),
    ))
    return build_analysis(extraction, fairness, "gemma")


async def speak(text: str, lang: str) -> str | None:
    if not sarvam.enabled():
        return None
    try:
        return await sarvam.text_to_speech(text, lang)
    except Exception as e:  # voice is a nice-to-have; the browser falls back to its own speech
        log.warning("TTS failed: %s", e)
        return None


# ---------- routes ----------

@app.get("/api/health")
def health():
    return {"gemma": gemma.enabled(), "sarvam": sarvam.enabled(), "model": gemma._model() if gemma.enabled() else None}


@app.get("/api/sample")
def sample():
    return {"text": SAMPLE_TEXT}


@app.post("/api/analyze")
async def analyze(file: UploadFile | None = File(None), sample: bool = Form(False)):
    image = await file.read() if file else None
    text = SAMPLE_TEXT if sample or not image else None
    key = hashlib.sha256(image or text.encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"{key}.json"
    if cached.exists():
        return {**json.loads(cached.read_text(encoding="utf-8")), "sample": text is not None}

    if not gemma.enabled():
        return demo_analysis("Demo mode: add GEMINI_API_KEY to analyse your own document. Showing the sample agreement.")
    try:
        result = await gemma_analysis(image, file.content_type if file else "image/jpeg", text)
    except Exception as e:
        log.exception("Gemma analysis failed")
        return demo_analysis(f"Couldn't reach Gemma ({type(e).__name__}). Showing the cached sample analysis.")
    cached.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    return {**result, "sample": text is not None}


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


async def live_or_none(call):
    """Run a Gemma call, but give up after LIVE_TIMEOUT seconds so a slow free-tier response can't stall the demo."""
    try:
        return await asyncio.wait_for(call, LIVE_TIMEOUT)
    except Exception as e:
        log.warning("Gemma call failed or timed out, using fallback: %s", type(e).__name__)
        return None


@app.post("/api/ask")
async def ask(body: AskBody):
    lang = body.language_code or "en-IN"
    clauses = body.analysis.get("clauses", [])

    out = None
    if gemma.enabled() and body.analysis.get("source") == "gemma":
        question_en = body.question
        if sarvam.enabled() and not lang.startswith("en"):
            question_en = await sarvam.translate(body.question, lang, "en-IN")
        out = await live_or_none(gemma.generate_json(prompts.ASK.format(
            clauses=_clauses_for_prompt(clauses), rules=_rules_for_prompt(), question=question_en)))
    if out:
        answer_en = out.get("answer", "")
        answer = await sarvam.translate(answer_en, "en-IN", lang) if sarvam.enabled() else answer_en
        answer_lang = lang if sarvam.enabled() else "en-IN"
        clause_ids, rule_ids, confidence = out.get("clause_ids", []), out.get("rule_ids", []), out.get("confidence", "high")
    else:
        # Canned answers describe the sample agreement, so never use them for someone's own document.
        is_sample = body.analysis.get("source") == "demo" or body.analysis.get("sample")
        entry = demo_answer(body.question) if is_sample else demo_data.QA_RETRY
        answer_en = entry["en"]
        if lang.startswith("hi"):
            answer, answer_lang = entry["hi"], "hi-IN"
        elif sarvam.enabled() and not lang.startswith("en"):
            answer, answer_lang = await sarvam.translate(answer_en, "en-IN", lang), lang
        else:
            answer, answer_lang = answer_en, "en-IN"
        clause_ids, rule_ids = entry["clause_ids"], entry["rule_ids"]
        # A canned answer is only trustworthy for the sample it was written for.
        confidence = entry["confidence"] if body.analysis.get("source") == "demo" else "low"

    valid_clauses = {c["id"] for c in clauses}
    return {
        "answer": answer,
        "answer_en": answer_en,
        "language_code": answer_lang,
        "clause_ids": [c for c in clause_ids if c in valid_clauses],
        "rule_ids": [r for r in rule_ids if r in RULES],
        "confidence": confidence,
        "audio_base64": await speak(answer, answer_lang),
    }


class NegotiateBody(BaseModel):
    language_code: str = "en-IN"
    analysis: dict


@app.post("/api/negotiate")
async def negotiate(body: NegotiateBody):
    lang = body.language_code or "en-IN"
    concerns = [
        f"Clause {c.get('number')}: {c.get('reason')}"
        for c in body.analysis.get("clauses", []) if c.get("severity") in ("red", "amber")
    ] + [f"Missing: {m['label']}" for m in body.analysis.get("missing", [])]

    out = None
    if gemma.enabled() and body.analysis.get("source") == "gemma":
        out = await live_or_none(gemma.generate_json(prompts.NEGOTIATE.format(concerns="\n".join(concerns))))
    if out and out.get("message"):
        message_en = out["message"]
        message =await sarvam.translate(message_en, "en-IN", lang) if sarvam.enabled() else message_en
        message_lang = lang if sarvam.enabled() else "en-IN"
    elif body.analysis.get("source") != "demo" and not body.analysis.get("sample"):
        # Someone's own document: build a plain request from its flagged clauses instead of the sample's letter.
        titles = [c.get("title", "").lower() for c in body.analysis.get("clauses", []) if c.get("severity") == "red"]
        message_en = (
            "Namaste ji, thank you for the agreement. Before signing, could we revisit a few clauses so they match "
            f"the national Model Tenancy Act: {', '.join(titles) or 'the terms I flagged'}? Happy to discuss. Thank you!"
        )
        if sarvam.enabled() and not lang.startswith("en"):
            message, message_lang = await sarvam.translate(message_en, "en-IN", lang), lang
        else:
            message, message_lang = message_en, "en-IN"
    else:
        message_en = demo_data.NEGOTIATE["en"]
        if lang.startswith("hi"):
            message, message_lang = demo_data.NEGOTIATE["hi"], "hi-IN"
        elif sarvam.enabled() and not lang.startswith("en"):
            message, message_lang = await sarvam.translate(message_en, "en-IN", lang), lang
        else:
            message, message_lang = message_en, "en-IN"

    audio = await speak(message, message_lang)
    return {
        "message": message,
        "message_en": message_en,
        "language_code": message_lang,
        "whatsapp_url": "https://wa.me/?text=" + quote(message),
        "audio_base64": audio,
    }


# Serve the built frontend from the same server for the demo (npm run build in ../frontend).
DIST = HERE.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    asyncio.run(uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8000)).serve())
