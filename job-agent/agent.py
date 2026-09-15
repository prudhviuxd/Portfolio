"""A job-search agent built on the Anthropic SDK's tool runner.

The shape of this file is the whole lesson: you write tool *functions*, the
SDK runs the agent loop. Every `@beta_tool` below becomes something Claude can
call; `tool_runner` handles request -> tool call -> result -> request until
Claude has nothing left to do.

The one hard rule encoded here: no tool submits an application. The agent
finds, screens, and writes; a human clicks Apply. See README.md for why.

    python agent.py                      # run the default mission
    python agent.py "your instruction"   # run a one-off instruction
    python agent.py --status             # queue counts, no model call
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

import anthropic
from anthropic import beta_tool

import sources
import store

ROOT = pathlib.Path(__file__).resolve().parent
PROFILE_DIR = ROOT / "profile"
OUT_DIR = ROOT / "out"

MODEL = "claude-opus-5"

# Ceiling on model turns in one run. Screening ~30 postings and writing a few
# packets sits well under this; hitting it means something looped.
MAX_ITERATIONS = 60

SYSTEM = """You are a job-search agent working for one person. Their profile
and search preferences are on disk; read them first and treat them as the
source of truth about what they have done and what they want.

Your job, in order:
1. Bring in new postings from the available sources.
2. Screen each new posting against the profile and preferences. Score fit
   0-100 and record it. Be honest and be harsh - a 60 that you talk yourself
   into wastes a real application. Reject aggressively, and say why.
3. For strong matches only, write a tailored application packet: a CV
   rewritten to lead with the evidence this specific posting asks for, a
   cover letter, and draft answers to the screening questions the posting
   implies.

Rules for the packet:
- Never invent an employer, a date, a qualification, or a metric. Every number
  you use must already appear in the profile. If the posting asks for
  something the profile does not evidence, leave it out and note the gap in
  your summary rather than papering over it.
- Reorder, re-weight and re-word freely. That is tailoring. Fabrication is not.
- Write like the person, not like a template. No "results-driven professional".
- Where the profile is genuinely incomplete (employment history, education),
  say so in the gap notes instead of filling it in.

You do not submit applications and you have no tool that can. You prepare;
the human sends. When you finish, report what you queued and what needs their
attention."""

DEFAULT_MISSION = """Run today's cycle:
1. Read my profile and preferences.
2. Pull new postings from the sources my preferences name.
3. Screen everything currently in `new` status and record a fit score for each.
4. Write packets for anything scoring 75 or above.
5. Summarise: what you queued, what you rejected and why, and anything in my
   profile that kept coming up as a gap."""


# ---------------------------------------------------------------------------
# Tools. Each docstring is the tool description Claude reads - write them for
# the model, not for a human maintainer. The Args section becomes the schema.
# ---------------------------------------------------------------------------

@beta_tool
def read_profile() -> str:
    """Read the candidate's master profile and search preferences.

    Call this before screening or writing anything. The profile is the only
    permitted source of facts about the candidate's history.
    """
    parts = []
    for name in ("profile.md", "preferences.md"):
        path = PROFILE_DIR / name
        if path.exists():
            parts.append(f"===== {name} =====\n{path.read_text()}")
    return "\n\n".join(parts) if parts else "No profile files found in profile/."


@beta_tool
def find_jobs(query: str, location: str = "", sources_list: str = "adzuna,remotive") -> str:
    """Search aggregator job sources and add anything new to the queue.

    Args:
        query: Role keywords, e.g. "design lead" or "head of ux". Keep it
            broad; screening happens later and is cheap.
        location: City, region or country. Ignored by remote-only sources.
        sources_list: Comma-separated subset of: adzuna, remotive, arbeitnow.
    """
    found, notes = [], []
    for name in [s.strip() for s in sources_list.split(",") if s.strip()]:
        fn = sources.SEARCHABLE.get(name)
        if not fn:
            notes.append(f"{name}: unknown source, skipped")
            continue
        try:
            got = fn(query, location) if name == "adzuna" else fn(query)
            found.extend(got)
            notes.append(f"{name}: {len(got)}")
        except Exception as exc:  # a dead source must not kill the run
            notes.append(f"{name}: failed ({exc.__class__.__name__})")

    result = store.upsert_jobs(found)
    if not found and "adzuna" in sources_list:
        notes.append("adzuna returned nothing - ADZUNA_APP_ID/KEY may be unset")
    return json.dumps({"fetched": len(found), "per_source": notes, **result})


@beta_tool
def find_jobs_at_company(company_slug: str, ats: str) -> str:
    """Pull every open role from one company's public ATS board.

    Use this for companies the candidate named as targets. The slug is the
    company's identifier in its board URL, e.g. the "figma" in
    boards.greenhouse.io/figma.

    Args:
        company_slug: Company identifier from the board URL.
        ats: Which system hosts the board: greenhouse, lever, or ashby.
    """
    fn = sources.BOARDS.get(ats.strip().lower())
    if not fn:
        return json.dumps({"error": f"unknown ats '{ats}'; use greenhouse, lever or ashby"})
    try:
        found = fn(company_slug.strip())
    except Exception as exc:
        return json.dumps({"error": f"{exc.__class__.__name__}: {exc}"})
    if not found:
        return json.dumps({"fetched": 0, "note": "no board found at that slug, or no open roles"})
    return json.dumps({"fetched": len(found), **store.upsert_jobs(found)})


@beta_tool
def import_jobs(path: str) -> str:
    """Import jobs the candidate collected by hand into the queue.

    This is the LinkedIn and Naukri path: they saved or exported postings
    themselves. Accepts a CSV or JSON file with title and company columns at
    minimum.

    Args:
        path: Path to the CSV or JSON file.
    """
    try:
        found = sources.from_file(path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        return json.dumps({"error": str(exc)})
    return json.dumps({"parsed": len(found), **store.upsert_jobs(found)})


@beta_tool
def add_job(title: str, company: str, description: str, url: str = "", location: str = "") -> str:
    """Add a single posting the candidate pasted in, description text included.

    Use this when a posting lives behind a login (LinkedIn, Naukri) and the
    candidate supplied the text directly.

    Args:
        title: Job title exactly as posted.
        company: Hiring company.
        description: Full job description text.
        url: Link to the posting, if there is one.
        location: Location as posted.
    """
    job = {
        "source": "manual",
        "title": title,
        "company": company,
        "description": description,
        "url": url,
        "location": location,
    }
    result = store.upsert_jobs([job])
    return json.dumps({**result, "id": store.job_id(company, title, url)})


@beta_tool
def list_jobs(status: str = "new", limit: int = 25, min_score: int = -1) -> str:
    """List jobs in the queue, best fit first.

    Args:
        status: One of new, screened, rejected, packet_ready, applied, closed.
            Pass "any" for all statuses.
        limit: Maximum rows to return.
        min_score: Only jobs scoring at least this. Use -1 for no filter.
    """
    rows = store.list_jobs(
        status=None if status == "any" else status,
        limit=max(1, min(limit, 100)),
        min_score=None if min_score < 0 else min_score,
    )
    return json.dumps(rows, indent=1)


@beta_tool
def read_job(job_id: str) -> str:
    """Read one posting in full, description included. Read before scoring.

    Args:
        job_id: The job's id from list_jobs.
    """
    job = store.get_job(job_id)
    if not job:
        return json.dumps({"error": f"no job with id {job_id}"})
    job["description"] = (job.get("description") or "")[:12000]
    return json.dumps(job, indent=1)


@beta_tool
def record_fit(job_id: str, score: int, notes: str) -> str:
    """Record a fit judgement for a job and move it out of the new queue.

    Scoring 0-100. Below 60 marks the job rejected; 60 and above marks it
    screened and eligible for a packet.

    Args:
        job_id: The job's id.
        score: Fit 0-100, judged against the profile and preferences.
        notes: Why this score. Name the specific evidence that matched and
            the specific requirement that did not. Two or three sentences.
    """
    score = max(0, min(100, int(score)))
    status = "rejected" if score < 60 else "screened"
    if not store.update_job(job_id, fit_score=score, fit_notes=notes, status=status):
        return json.dumps({"error": f"no job with id {job_id}"})
    store.log_event(job_id, "screened", f"{score}: {notes}")
    return json.dumps({"job_id": job_id, "score": score, "status": status})


@beta_tool
def write_packet(job_id: str, cv_markdown: str, cover_letter: str, screening_answers: str) -> str:
    """Write a tailored application packet to disk for the human to submit.

    This is the end of the agent's authority. It writes files; it does not
    send anything anywhere.

    Args:
        job_id: The job's id.
        cv_markdown: Full tailored CV in Markdown, ready to export. Facts
            drawn only from the profile, ordered for this posting.
        cover_letter: Cover letter body, no letterhead, under 300 words.
        screening_answers: Draft answers to the screening questions this
            posting implies (notice period, expected compensation, work
            authorisation, portfolio prompts). Markdown Q/A pairs.
    """
    job = store.get_job(job_id)
    if not job:
        return json.dumps({"error": f"no job with id {job_id}"})

    slug = re.sub(r"[^a-z0-9]+", "-", f"{job['company']}-{job['title']}".lower()).strip("-")[:60]
    packet = OUT_DIR / f"{slug}-{job_id[:8]}"
    packet.mkdir(parents=True, exist_ok=True)

    (packet / "cv.md").write_text(cv_markdown)
    (packet / "cover-letter.md").write_text(cover_letter)
    (packet / "screening-answers.md").write_text(screening_answers)
    (packet / "job.md").write_text(
        f"# {job['title']}\n\n**{job['company']}** - {job.get('location') or 'location not stated'}\n\n"
        f"{job.get('url') or 'no url'}\n\nFit {job.get('fit_score')}: {job.get('fit_notes') or ''}\n\n"
        f"---\n\n{job.get('description') or ''}"
    )

    store.update_job(job_id, status="packet_ready", packet_dir=str(packet))
    store.log_event(job_id, "packet_written", str(packet))
    return json.dumps({"job_id": job_id, "packet_dir": str(packet), "status": "packet_ready"})


@beta_tool
def set_status(job_id: str, status: str, note: str = "") -> str:
    """Change a job's status - e.g. after the human submits, or to close one out.

    Args:
        job_id: The job's id.
        status: new, screened, rejected, packet_ready, applied, or closed.
        note: Optional reason, recorded in the job's history.
    """
    if status not in store.STATUSES:
        return json.dumps({"error": f"status must be one of {list(store.STATUSES)}"})
    if not store.update_job(job_id, status=status):
        return json.dumps({"error": f"no job with id {job_id}"})
    store.log_event(job_id, "status", f"{status}: {note}")
    return json.dumps({"job_id": job_id, "status": status})


TOOLS = [
    read_profile,
    find_jobs,
    find_jobs_at_company,
    import_jobs,
    add_job,
    list_jobs,
    read_job,
    record_fit,
    write_packet,
    set_status,
]


def run(mission: str) -> None:
    client = anthropic.Anthropic()

    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        output_config={"effort": "high"},
        # The system prompt and tool schemas are identical on every turn and a
        # screening run makes dozens of turns. Caching that prefix cuts its
        # cost by ~90%; `usage` below shows whether it is actually hitting.
        cache_control={"type": "ephemeral"},
        # Unbounded by default. A confused agent with no cap bills until it
        # gives up, which for an unattended run is the expensive failure mode.
        max_iterations=MAX_ITERATIONS,
        tools=TOOLS,
        messages=[{"role": "user", "content": mission}],
    )

    # Each iteration is one model turn. The runner has already executed any
    # tools that turn asked for by the time the next one arrives.
    last = None
    turns = 0
    totals = {"in": 0, "out": 0, "cache_read": 0, "cache_write": 0}

    for message in runner:
        last, turns = message, turns + 1
        u = message.usage
        totals["in"] += u.input_tokens or 0
        totals["out"] += u.output_tokens or 0
        totals["cache_read"] += getattr(u, "cache_read_input_tokens", 0) or 0
        totals["cache_write"] += getattr(u, "cache_creation_input_tokens", 0) or 0

        for block in message.content:
            if block.type == "text" and block.text.strip():
                print(block.text)
            elif block.type == "tool_use":
                print(f"  -> {block.name}({json.dumps(block.input)[:140]})", file=sys.stderr)

    # Hitting the cap ends the loop with no exception and no flag - the last
    # turn still wanted a tool. Without this check that reads as a clean
    # finish, and the run looks complete when it was cut off mid-screening.
    truncated = last is not None and any(b.type == "tool_use" for b in last.content)

    print("\n" + "-" * 60)
    if truncated:
        print(f"!! STOPPED at the {MAX_ITERATIONS}-turn cap with work still pending.")
        print("   Re-run to continue - the queue is on disk, so nothing is lost.")
    print(f"turns: {turns}  tokens: {totals['in']} in / {totals['out']} out")
    print(f"cache: {totals['cache_read']} read / {totals['cache_write']} written", end="")
    if totals["cache_read"] == 0 and turns > 2:
        print("  <- zero reads over several turns: the prefix is being invalidated")
    else:
        print()
    print("queue:", json.dumps(store.summary()))
    print(f"packets: {OUT_DIR}")


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--status":
        print(json.dumps(store.summary(), indent=2))
        for row in store.list_jobs(status=None, limit=40):
            print(f"  {row['id']}  {str(row['fit_score'] or '--'):>3}  {row['status']:<12} "
                  f"{row['company'][:28]:<28} {row['title'][:44]}")
        return
    run(" ".join(args) if args else DEFAULT_MISSION)


if __name__ == "__main__":
    main()
