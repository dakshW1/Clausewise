"""Case history: every scanned document, its revised versions, negotiation events and per-clause outcomes (SQLite)."""

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB = Path(__file__).parent / "data" / "clausewise.db"
OUTCOMES = ("pending", "agreed", "partly", "refused")
STATUSES = ("reviewing", "negotiating", "signed", "walked_away")

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, title TEXT, doc_type TEXT, doc_label TEXT, parties TEXT,
  status TEXT DEFAULT 'reviewing', example INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, label TEXT, score INTEGER, counts TEXT,
  analysis TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, kind TEXT, text TEXT, meta TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS outcomes (
  case_id TEXT, clause_id TEXT, number TEXT, title TEXT, severity TEXT, rule_id TEXT, reason TEXT,
  status TEXT DEFAULT 'pending', note TEXT DEFAULT '', updated_at TEXT, PRIMARY KEY (case_id, clause_id)
);
"""


def _now(offset_days: float = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).isoformat(timespec="seconds")


@contextmanager
def db():
    DB.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init(seed_from=None):
    """Create tables; on an empty database, add the example cases built by `seed_from()`."""
    with db() as con:
        con.executescript(SCHEMA)
        empty = con.execute("SELECT COUNT(*) FROM cases").fetchone()[0] == 0
    if empty and seed_from:
        seed_from()


def _touch(con, case_id: str, when: str | None = None):
    con.execute("UPDATE cases SET updated_at=? WHERE id=?", (when or _now(), case_id))


def add_event(case_id: str, kind: str, text: str, meta: dict | None = None, when: str | None = None, con=None):
    def run(c):
        c.execute("INSERT INTO events (case_id, kind, text, meta, created_at) VALUES (?,?,?,?,?)",
                  (case_id, kind, text, json.dumps(meta or {}), when or _now()))
        _touch(c, case_id, when)
    if con:
        run(con)
    else:
        with db() as c:
            run(c)


def create_case(analysis: dict, example: bool = False, when: str | None = None) -> str:
    case_id = uuid.uuid4().hex[:10]
    when = when or _now()
    with db() as con:
        con.execute(
            "INSERT INTO cases (id, title, doc_type, doc_label, parties, status, example, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (case_id, analysis.get("title"), analysis.get("doc_type"), analysis.get("doc_label"),
             json.dumps(analysis.get("parties") or {}), "reviewing", int(example), when, when),
        )
        con.execute(
            "INSERT INTO versions (case_id, label, score, counts, analysis, created_at) VALUES (?,?,?,?,?,?)",
            (case_id, "Original", analysis.get("score"), json.dumps(analysis.get("counts")), json.dumps(analysis, ensure_ascii=False), when),
        )
        for c in analysis.get("clauses", []):
            if c.get("severity") in ("red", "amber"):
                con.execute(
                    "INSERT INTO outcomes (case_id, clause_id, number, title, severity, rule_id, reason, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                    (case_id, c["id"], c.get("number"), c.get("title"), c["severity"], c.get("rule_id"), c.get("reason"), when),
                )
        counts = analysis.get("counts") or {}
        add_event(case_id, "scanned", f"Scanned the document: {analysis.get('score')}/100, "
                  f"{counts.get('red', 0)} unfair and {counts.get('amber', 0)} unusual clauses.",
                  {"score": analysis.get("score")}, when, con)
    return case_id


def add_version(case_id: str, analysis: dict, when: str | None = None) -> dict:
    """Store a revised version and mark every flagged clause that is now fair as agreed."""
    when = when or _now()
    with db() as con:
        n = con.execute("SELECT COUNT(*) FROM versions WHERE case_id=?", (case_id,)).fetchone()[0]
        first = con.execute("SELECT score FROM versions WHERE case_id=? ORDER BY id LIMIT 1", (case_id,)).fetchone()
        con.execute(
            "INSERT INTO versions (case_id, label, score, counts, analysis, created_at) VALUES (?,?,?,?,?,?)",
            (case_id, f"Revision {n}", analysis.get("score"), json.dumps(analysis.get("counts")), json.dumps(analysis, ensure_ascii=False), when),
        )
        by_number = {str(c.get("number")): c for c in analysis.get("clauses", [])}
        fixed = []
        for row in con.execute("SELECT clause_id, number, title, status FROM outcomes WHERE case_id=?", (case_id,)).fetchall():
            new = by_number.get(str(row["number"]))
            if new and new.get("severity") == "green" and row["status"] != "agreed":
                con.execute("UPDATE outcomes SET status='agreed', note=?, updated_at=? WHERE case_id=? AND clause_id=?",
                            ("Fair in the revised version", when, case_id, row["clause_id"]))
                fixed.append(f"Clause {row['number']} ({row['title']})")
        delta = (analysis.get("score") or 0) - (first["score"] if first else 0)
        add_event(case_id, "revised",
                  f"Revised version scanned: {analysis.get('score')}/100 ({'+' if delta >= 0 else ''}{delta} since the original)."
                  + (f" Now fair: {', '.join(fixed)}." if fixed else ""),
                  {"score": analysis.get("score"), "fixed": fixed}, when, con)
    return get_case(case_id)


def set_outcome(case_id: str, clause_id: str, status: str, note: str = "", them: str = "They", when: str | None = None) -> dict:
    if status not in OUTCOMES:
        raise ValueError("bad status")
    with db() as con:
        row = con.execute("SELECT number, title FROM outcomes WHERE case_id=? AND clause_id=?", (case_id, clause_id)).fetchone()
        if not row:
            raise KeyError(clause_id)
        con.execute("UPDATE outcomes SET status=?, note=?, updated_at=? WHERE case_id=? AND clause_id=?",
                    (status, note, when or _now(), case_id, clause_id))
        verb = {"agreed": "agreed to change", "partly": "partly agreed on", "refused": "refused to change", "pending": "has not answered on"}[status]
        add_event(case_id, "clause_update", f"{them} {verb} Clause {row['number']} ({row['title']})." + (f" {note}" if note else ""),
                  {"clause_id": clause_id, "status": status}, when, con)
    return get_case(case_id)


def set_status(case_id: str, status: str, when: str | None = None) -> dict:
    if status not in STATUSES:
        raise ValueError("bad status")
    with db() as con:
        con.execute("UPDATE cases SET status=? WHERE id=?", (status, case_id))
        label = {"reviewing": "Back to reviewing", "negotiating": "Started negotiating", "signed": "Signed the agreement", "walked_away": "Walked away"}[status]
        add_event(case_id, "status", label + ".", {"status": status}, when, con)
    return get_case(case_id)


def delete_case(case_id: str):
    with db() as con:
        for table in ("events", "outcomes", "versions"):
            con.execute(f"DELETE FROM {table} WHERE case_id=?", (case_id,))
        con.execute("DELETE FROM cases WHERE id=?", (case_id,))


def _summary(con, row) -> dict:
    versions = con.execute("SELECT label, score, created_at FROM versions WHERE case_id=? ORDER BY id", (row["id"],)).fetchall()
    outs = con.execute("SELECT status, COUNT(*) n FROM outcomes WHERE case_id=? GROUP BY status", (row["id"],)).fetchall()
    tally = {s: 0 for s in OUTCOMES} | {o["status"]: o["n"] for o in outs}
    return {
        "id": row["id"], "title": row["title"], "doc_type": row["doc_type"], "doc_label": row["doc_label"],
        "parties": json.loads(row["parties"] or "{}"), "status": row["status"], "example": bool(row["example"]),
        "created_at": row["created_at"], "updated_at": row["updated_at"],
        "scores": [{"label": v["label"], "score": v["score"], "at": v["created_at"]} for v in versions],
        "outcomes": tally,
    }


def list_cases() -> list[dict]:
    with db() as con:
        rows = con.execute("SELECT * FROM cases ORDER BY updated_at DESC").fetchall()
        return [_summary(con, r) for r in rows]


def get_case(case_id: str) -> dict:
    with db() as con:
        row = con.execute("SELECT * FROM cases WHERE id=?", (case_id,)).fetchone()
        if not row:
            raise KeyError(case_id)
        out = _summary(con, row)
        latest = con.execute("SELECT analysis FROM versions WHERE case_id=? ORDER BY id DESC LIMIT 1", (case_id,)).fetchone()
        out["latest_analysis"] = json.loads(latest["analysis"]) if latest else None
        out["versions"] = [
            {"label": v["label"], "score": v["score"], "at": v["created_at"], "analysis": json.loads(v["analysis"])}
            for v in con.execute("SELECT label, score, created_at, analysis FROM versions WHERE case_id=? ORDER BY id", (case_id,)).fetchall()
        ]
        out["events"] = [
            {"kind": e["kind"], "text": e["text"], "meta": json.loads(e["meta"] or "{}"), "at": e["created_at"]}
            for e in con.execute("SELECT * FROM events WHERE case_id=? ORDER BY created_at, id", (case_id,)).fetchall()
        ]
        out["clauses"] = [dict(o) for o in con.execute(
            "SELECT clause_id, number, title, severity, rule_id, reason, status, note, updated_at FROM outcomes WHERE case_id=? "
            "ORDER BY CAST(number AS INTEGER)", (case_id,)).fetchall()]
        return out
