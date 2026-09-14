"""Job ingestion from sources that permit programmatic access.

Deliberately absent: LinkedIn and Naukri scrapers. Both prohibit automated
access in their terms, neither exposes a public jobs API, and a scraper
against either one gets the account restricted and breaks on every DOM
change. Those two are covered instead by:

  * `adzuna()` - an aggregator whose India index carries a large share of the
    same listings, via a documented API with a free tier; and
  * `from_file()` - jobs you saved on LinkedIn/Naukri and exported, or a
    hand-kept CSV of URLs. Human does the browsing, agent does the work.

Every function returns the same normalised dict shape so the agent does not
need to know where a posting came from:

    {source, title, company, location, url, description, posted_at}
"""

from __future__ import annotations

import csv
import html
import json
import os
import pathlib
import re
import urllib.parse

import requests

TIMEOUT = 20
UA = {"User-Agent": "job-agent/1.0 (personal job search)"}


def _strip_html(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>|</p>|</li>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", text)).strip()


def _get(url: str, **kwargs) -> requests.Response | None:
    try:
        r = requests.get(url, headers=UA, timeout=TIMEOUT, **kwargs)
        r.raise_for_status()
        return r
    except requests.RequestException:
        return None


# --------------------------------------------------------------------------
# Company ATS boards - public, documented, meant to be read by machines.
# --------------------------------------------------------------------------

def greenhouse(company: str) -> list[dict]:
    r = _get(f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true")
    if not r:
        return []
    return [
        {
            "source": f"greenhouse:{company}",
            "title": j.get("title", ""),
            "company": company,
            "location": (j.get("location") or {}).get("name", ""),
            "url": j.get("absolute_url", ""),
            "description": _strip_html(j.get("content", "")),
            "posted_at": j.get("updated_at", ""),
        }
        for j in r.json().get("jobs", [])
    ]


def lever(company: str) -> list[dict]:
    r = _get(f"https://api.lever.co/v0/postings/{company}?mode=json")
    if not r:
        return []
    return [
        {
            "source": f"lever:{company}",
            "title": j.get("text", ""),
            "company": company,
            "location": (j.get("categories") or {}).get("location", ""),
            "url": j.get("hostedUrl", ""),
            "description": _strip_html(j.get("descriptionPlain") or j.get("description", "")),
            "posted_at": str(j.get("createdAt", "")),
        }
        for j in r.json()
    ]


def ashby(company: str) -> list[dict]:
    r = _get(f"https://api.ashbyhq.com/posting-api/job-board/{company}")
    if not r:
        return []
    return [
        {
            "source": f"ashby:{company}",
            "title": j.get("title", ""),
            "company": company,
            "location": j.get("location", ""),
            "url": j.get("jobUrl", ""),
            "description": _strip_html(j.get("descriptionHtml", "")),
            "posted_at": j.get("publishedAt", ""),
        }
        for j in r.json().get("jobs", [])
    ]


# --------------------------------------------------------------------------
# Aggregators with public APIs.
# --------------------------------------------------------------------------

def adzuna(what: str, where: str = "", country: str = "in", pages: int = 1) -> list[dict]:
    """Adzuna aggregates Indian job boards, Naukri-sourced listings included.

    Needs a free app id/key from developer.adzuna.com in ADZUNA_APP_ID /
    ADZUNA_APP_KEY. Returns [] with no credentials rather than failing, so a
    run without them degrades to the other sources.
    """
    app_id, app_key = os.getenv("ADZUNA_APP_ID"), os.getenv("ADZUNA_APP_KEY")
    if not (app_id and app_key):
        return []
    out = []
    for page in range(1, pages + 1):
        params = {
            "app_id": app_id,
            "app_key": app_key,
            "what": what,
            "results_per_page": 50,
            "content-type": "application/json",
        }
        if where:
            params["where"] = where
        r = _get(f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}", params=params)
        if not r:
            break
        for j in r.json().get("results", []):
            out.append(
                {
                    "source": "adzuna",
                    "title": j.get("title", ""),
                    "company": (j.get("company") or {}).get("display_name", ""),
                    "location": (j.get("location") or {}).get("display_name", ""),
                    "url": j.get("redirect_url", ""),
                    "description": _strip_html(j.get("description", "")),
                    "posted_at": j.get("created", ""),
                }
            )
    return out


def remotive(search: str) -> list[dict]:
    r = _get("https://remotive.com/api/remote-jobs", params={"search": search, "limit": 50})
    if not r:
        return []
    return [
        {
            "source": "remotive",
            "title": j.get("title", ""),
            "company": j.get("company_name", ""),
            "location": j.get("candidate_required_location", "Remote"),
            "url": j.get("url", ""),
            "description": _strip_html(j.get("description", "")),
            "posted_at": j.get("publication_date", ""),
        }
        for j in r.json().get("jobs", [])
    ]


def arbeitnow(search: str = "") -> list[dict]:
    r = _get("https://www.arbeitnow.com/api/job-board-api")
    if not r:
        return []
    jobs = r.json().get("data", [])
    if search:
        needle = search.lower()
        jobs = [j for j in jobs if needle in (j.get("title", "") + j.get("description", "")).lower()]
    return [
        {
            "source": "arbeitnow",
            "title": j.get("title", ""),
            "company": j.get("company_name", ""),
            "location": j.get("location", ""),
            "url": j.get("url", ""),
            "description": _strip_html(j.get("description", "")),
            "posted_at": str(j.get("created_at", "")),
        }
        for j in jobs
    ]


# --------------------------------------------------------------------------
# Manual import - the LinkedIn / Naukri path.
# --------------------------------------------------------------------------

def from_file(path: str) -> list[dict]:
    """Read jobs you collected by hand.

    Accepts a JSON array of job dicts, or a CSV with (at minimum) `title` and
    `company` columns - `url`, `location` and `description` are used when
    present. LinkedIn's saved-jobs export and a Naukri shortlist pasted into
    a spreadsheet both fit this shape.
    """
    p = pathlib.Path(path).expanduser()
    if not p.exists():
        raise FileNotFoundError(f"no such file: {p}")

    if p.suffix.lower() == ".json":
        rows = json.loads(p.read_text())
    else:
        with p.open(newline="", encoding="utf-8-sig") as fh:
            rows = list(csv.DictReader(fh))

    out = []
    for row in rows:
        row = {(k or "").strip().lower(): (v or "") for k, v in row.items()}
        title = row.get("title") or row.get("job title") or row.get("position")
        company = row.get("company") or row.get("company name") or row.get("employer")
        if not (title and company):
            continue
        out.append(
            {
                "source": row.get("source") or "imported",
                "title": title,
                "company": company,
                "location": row.get("location", ""),
                "url": row.get("url") or row.get("link", ""),
                "description": row.get("description") or row.get("notes", ""),
                "posted_at": row.get("posted_at", ""),
            }
        )
    return out


def fetch_url_text(url: str) -> str:
    """Fetch a single posting you pasted in, for boards that serve plain HTML.

    Best-effort: LinkedIn and Naukri render job detail behind a login and will
    return a stub or a challenge page here. When that happens, paste the
    description text into `add_job` instead - that always works.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("only http(s) URLs are supported")
    r = _get(url)
    if not r:
        return ""
    return _strip_html(r.text)[:20000]


SEARCHABLE = {"adzuna": adzuna, "remotive": remotive, "arbeitnow": arbeitnow}
BOARDS = {"greenhouse": greenhouse, "lever": lever, "ashby": ashby}
