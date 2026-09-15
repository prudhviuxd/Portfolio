"""SQLite-backed job queue.

The agent is stateless between runs; this file is the memory. Every job the
agent has ever seen lives here with a stable id, so re-running a search does
not re-process the same posting or produce a duplicate application.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import sqlite3
from datetime import datetime, timezone

DB_PATH = pathlib.Path(__file__).resolve().parent / "data" / "jobs.db"

STATUSES = ("new", "screened", "rejected", "packet_ready", "applied", "closed")

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id           TEXT PRIMARY KEY,
    source       TEXT NOT NULL,
    title        TEXT NOT NULL,
    company      TEXT NOT NULL,
    location     TEXT,
    url          TEXT,
    description  TEXT,
    posted_at    TEXT,
    status       TEXT NOT NULL DEFAULT 'new',
    fit_score    INTEGER,
    fit_notes    TEXT,
    packet_dir   TEXT,
    first_seen   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id   TEXT NOT NULL,
    at       TEXT NOT NULL,
    kind     TEXT NOT NULL,
    detail   TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def job_id(company: str, title: str, url: str = "") -> str:
    """Stable id so the same posting seen twice collapses to one row.

    Keyed on company+title+url rather than the aggregator's own id, because
    the same job legitimately appears on several boards under different ids.
    """
    key = f"{company.strip().lower()}|{title.strip().lower()}|{url.strip().lower()}"
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def upsert_jobs(jobs: list[dict]) -> dict:
    """Insert new postings, leave already-known ones untouched.

    Returns counts plus the ids of genuinely new rows, so the agent knows
    what is worth reading and does not re-screen the whole backlog.
    """
    added, seen_again = [], 0
    with connect() as conn:
        for job in jobs:
            jid = job_id(job.get("company", ""), job.get("title", ""), job.get("url", ""))
            existing = conn.execute("SELECT id FROM jobs WHERE id = ?", (jid,)).fetchone()
            if existing:
                seen_again += 1
                continue
            conn.execute(
                """INSERT INTO jobs (id, source, title, company, location, url,
                                     description, posted_at, first_seen, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    jid,
                    job.get("source", "unknown"),
                    job.get("title", "")[:300],
                    job.get("company", "")[:200],
                    job.get("location", ""),
                    job.get("url", ""),
                    job.get("description", ""),
                    job.get("posted_at", ""),
                    _now(),
                    _now(),
                ),
            )
            added.append(jid)
    return {"added": len(added), "already_known": seen_again, "new_ids": added}


def get_job(jid: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (jid,)).fetchone()
    return dict(row) if row else None


def list_jobs(status: str | None = None, limit: int = 25, min_score: int | None = None) -> list[dict]:
    query = "SELECT id, title, company, location, status, fit_score, url FROM jobs"
    clauses, params = [], []
    if status:
        clauses.append("status = ?")
        params.append(status)
    if min_score is not None:
        clauses.append("fit_score >= ?")
        params.append(min_score)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY COALESCE(fit_score, -1) DESC, first_seen DESC LIMIT ?"
    params.append(limit)
    with connect() as conn:
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def update_job(jid: str, **fields) -> bool:
    allowed = {"status", "fit_score", "fit_notes", "packet_dir", "description"}
    fields = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not fields:
        return False
    assignments = ", ".join(f"{k} = ?" for k in fields)
    with connect() as conn:
        cur = conn.execute(
            f"UPDATE jobs SET {assignments}, updated_at = ? WHERE id = ?",
            (*fields.values(), _now(), jid),
        )
        return cur.rowcount > 0


def log_event(jid: str, kind: str, detail: str = "") -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO events (job_id, at, kind, detail) VALUES (?, ?, ?, ?)",
            (jid, _now(), kind, detail),
        )


def summary() -> dict:
    with connect() as conn:
        rows = conn.execute("SELECT status, COUNT(*) c FROM jobs GROUP BY status").fetchall()
    return {r["status"]: r["c"] for r in rows}


if __name__ == "__main__":
    print(json.dumps(summary(), indent=2))
