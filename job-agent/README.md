# Job-search agent

A working Claude agent that finds postings, screens them against your profile,
and writes a tailored application packet for each strong match. You submit.

It is also meant to be read. The code is small on purpose — `agent.py` is the
entire agent, and most of it is tool functions. If you want to learn how agents
are built, read that file top to bottom before running anything.

---

## What an agent actually is

Strip away the vocabulary and an agent is one loop:

```
send conversation to the model
  → model replies "call tool X with these arguments"
  → you run X, append the result to the conversation
  → send it again
  → repeat until the model replies with an answer instead of a tool call
```

That's it. Everything else — memory, planning, multi-step reasoning — falls out
of running that loop with good tools and a good system prompt.

There are four ways to build it with Claude. They differ on **who writes the
loop** and **who hosts it**:

| | You write | Loop & hosting | Use when |
|---|---|---|---|
| Manual loop | the `while stop_reason == "tool_use"` loop | you write it, you host | you need control the runner doesn't expose |
| **Tool runner** | just the tool functions | SDK runs the loop, you host | **most custom-tool agents — this project** |
| Managed Agents | agent config + tool results | Anthropic runs and hosts it | long-running, scheduled, stateful agents |
| Claude Agent SDK | a prompt + options | Claude Code as a library, you host | coding / filesystem agents |

This project uses the **tool runner**, which is the right default: you get the
loop for free and still own every tool.

The most important judgement call comes before any of that: **most "agent" ideas
should not be agents.** A single API call or a fixed pipeline is cheaper,
faster and far easier to debug. Reach for an agent only when the task is
genuinely open-ended, the outcome justifies the cost, and errors are
recoverable. Job screening qualifies — every posting needs different judgement,
and a bad call costs one wasted application, not a production incident.

### The three things that decide whether an agent works

1. **Tool design.** Tools are the agent's entire vocabulary. A tool whose
   purpose isn't obvious from its name and docstring will be called wrongly.
   Every docstring in `agent.py` is written for the model to read, not for a
   maintainer — that's the schema Claude sees.
2. **Tools return facts, never raise.** Look at `read_job` with a bad id: it
   returns `{"error": "no job with id ..."}`. An exception kills the loop; an
   error string lets the model notice and correct itself. Every tool here
   does this.
3. **State lives outside the conversation.** `store.py` is a SQLite queue.
   The agent can run, stop, and run again tomorrow without re-reading its
   history, and a crash mid-run loses nothing. Context is working memory, not
   storage.

---

## About LinkedIn and Naukri

You asked for LinkedIn and Naukri. Here is the honest position, because it
shaped the whole design:

**Both prohibit automated scraping and automated application submission in
their terms of use, and neither offers a public jobs API.** Building a bot
against either gets your account restricted — a real cost when your account
*is* your professional network — and breaks whenever they change their markup.

So this agent covers them a different way:

- **`adzuna`** aggregates Indian job boards through a documented API with a
  free tier, and its India index carries a large share of the same listings,
  Naukri-sourced included.
- **`import_jobs`** takes a CSV or JSON of jobs you saved yourself. You browse
  LinkedIn like a human, save what looks good, export it, and the agent does
  the screening and writing.
- **`add_job`** takes one posting you pasted in, description text and all, for
  anything behind a login.

And nothing here submits an application. There is no tool that can. The agent
prepares a complete packet and marks it `packet_ready`; you read it and click
Apply. That is a deliberate limit, and it's also the better strategy — mass
auto-applied CVs get filtered, tailored ones get read.

---

## Setup

```bash
cd job-agent
pip install -r requirements.txt
cp .env.example .env     # add your ANTHROPIC_API_KEY
```

Then fill in the two gaps in `profile/profile.md` — **employment history and
education**. They're marked TODO because your portfolio site doesn't carry
them, and the agent is instructed never to invent a job, a date, or a
qualification. Until they're filled, every CV it writes will have a hole and
it will keep telling you so.

Edit `profile/preferences.md` too: target roles, locations, and the standing
answers to screening questions (notice period, expected comp).

Optional: a free Adzuna key from developer.adzuna.com unlocks the India search.
Without it that source returns nothing and the others still work.

## Running it

```bash
python agent.py                  # the default cycle: pull, screen, write packets
python agent.py "find design lead roles in Bangalore and screen them"
python agent.py "import jobs from ~/Downloads/saved.csv and screen them"
python agent.py --status         # queue state, no model call, costs nothing
```

Packets land in `out/<company>-<role>-<id>/`:

```
cv.md                  tailored CV, facts only from your profile
cover-letter.md        under 300 words
screening-answers.md   drafted answers to what the posting implies
job.md                 the posting, plus the fit score and reasoning
```

Read `cv.md` before you send it. The agent is instructed not to fabricate, and
the system prompt is explicit about it, but you are the one whose name is on it.

## The tools

| Tool | Does |
|---|---|
| `read_profile` | reads your profile and preferences — the only source of facts |
| `find_jobs` | searches Adzuna / Remotive / Arbeitnow |
| `find_jobs_at_company` | pulls a company's whole Greenhouse, Lever or Ashby board |
| `import_jobs` | imports a CSV/JSON you exported — the LinkedIn path |
| `add_job` | adds one pasted posting |
| `list_jobs` / `read_job` | reads the queue |
| `record_fit` | scores 0–100 with reasoning; under 60 auto-rejects |
| `write_packet` | writes the packet to disk — **the end of the agent's authority** |
| `set_status` | tracks a job through applied / closed |

## Cost

One full cycle screening ~30 postings and writing 3–4 packets runs a few
dollars on Opus 5. To cut it, screen on a cheaper model and write on Opus:
split `run()` into two runners with different `model=` values. Screening is
high-volume and mechanical; writing is where the quality shows.

## What to build next

- **Cache the profile.** It's resent on every turn. Add
  `cache_control={"type": "ephemeral"}` and watch `usage.cache_read_input_tokens`.
- **Schedule it.** A cron entry running the default mission each morning turns
  this into a standing process instead of a thing you remember to do.
- **Close the loop.** You have an `events` table. Record which packets got
  replies, feed that back into the screening prompt, and the fit scores start
  reflecting what actually converts rather than what looks good on paper.
