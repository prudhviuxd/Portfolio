# Moodboard v1 — Prudhvi Raj PJ, Design Leader Portfolio

## The conflict in the research

Two sets of sources point in opposite directions, and resolving this *is* the design decision.

| Source type | What it rewards |
|---|---|
| **Awwwards / CSSDA winners** (Samsy, Minh Pham, Uncommon Studio, Iventions, Mat Voyce) | WebGL, 3D scenes, elaborate scroll choreography, long immersive reveals. Judged by *designers*, scored on developer craft. |
| **Recruiter / hiring-manager research** (uxfol.io playbook, UXPin, uxplaybook) | 3–5 minute scan. Process visible. Quantified impact. Clean IA. Rejects on: hidden process, weak orientation, poor navigation. |

**The award winners are creative technologists selling execution.** Prudhvi is a **design leader selling judgement.** Copying Samsy's WebGL would win a designer's applause and lose a VP Design interview.

### Resolution
Take the **visual confidence** of the award tier and the **information architecture** of the recruiter research. Craft signals taste; structure signals judgement. A leader's portfolio must survive a 5-minute skim by someone who is not a designer.

---

## Inspiration Sources

| Source | Key takeaway |
|---|---|
| Awwwards portfolio winners | Oversized type as primary visual, confident dark palettes, restrained accent, motion that rewards rather than blocks |
| Minh Pham / Uncommon Studio | Project index over card grid; hover reveals rather than static thumbnails |
| uxfol.io recruiter playbook | 3–5 case studies max. Senior must show *problem definition*, not just solving. Mentorship + multi-stakeholder complexity |
| UXPin / uxplaybook | Scannable, fast, mobile-clean. "Beautiful mockups mean nothing if they didn't move the needle" |
| Current site (v2 Chrome) | Type scale, chrome gradient and bento all work. The *content structure* is what fails the research |

---

## Diagnosis of the current build

Measured against the recruiter criteria, not against taste:

| Criterion | Status |
|---|---|
| Quantified impact | Pass — 100+ / 200+ / 80% present |
| Visual system consistency | Pass |
| Fast, mobile-clean | Pass |
| **Orients the reader in seconds** | **Fail** — "Design that doesn't tarnish" is a slogan; it does not say what he leads or at what scale |
| **3–5 quality case studies** | **Fail** — 8 entries where 5 are dead ends, burning the scan budget |
| **Process visible from home** | **Fail** — approach is abstract convictions, no per-project method |
| **Problem definition + leadership scope** | **Fail** — no team size, stakeholder scale, or org context anywhere |

The visual layer is not the problem. The information layer is.

---

## Colour Direction — carry forward, unchanged

```
Background:  #08080B   near-black, cool bias
Surface:     rgba(255,255,255,.038)   glass
Text:        #F4F4F6   primary        18.2:1
Text 2:      #ADB0B8   secondary       9.2:1
Text 3:      #83878F   labels          5.6:1
Cyan:        #4FD8E8   accent         11.7:1
Violet:      #A98BFF   accent          7.5:1
Magenta:     #FF7BC8   accent          8.5:1
```
Chrome gradient (cyan → white → violet → magenta) stays reserved for one display word per section. All pairs already clear WCAG AA.

## Typography Direction — carry forward, unchanged

- **Display**: Bricolage Grotesque 800, uppercase, `-0.045em` tracking
- **Body**: Instrument Sans
- **Labels/data**: JetBrains Mono, `.16em`, uppercase
- All self-hosted woff2, no runtime font fetch

---

## What changes: structure, not skin

1. **Hero orients before it impresses** — keep the chrome statement, add a plain-language line underneath stating what he leads, at what scale, in which domains. Add proof chips (team size, org scale).
2. **Split work into two tiers** — three real case studies get large cards showing *role · problem · outcome* so the gist survives without a click. The other five drop to a compact "also shipped" row.
3. **Case study cards carry a metric** — the outcome is visible on the home page, not buried one level down.
4. **Leadership scope becomes explicit** — team size, stakeholders, org context stated as data, not implied.
5. **Aura dialled back** so content leads and the glow supports.

## Mood Keywords

Confident · Engineered · Iridescent · Scannable · Senior

## What to Avoid

- WebGL/3D showpieces — wrong signal for a leadership hire, and a performance cost
- Dead links in the work index — burns the 5-minute budget
- Abstract conviction copy with no project evidence attached
- Motion that gates content behind scroll choreography
- More than one chrome-filled phrase per viewport

---
---

# Moodboard v2 — the case study pages

v1 fixed the homepage. It left the three case studies untouched, and they are still
running the original design system. Clicking a project card is a visible rupture:
cyan/violet chrome and Bricolage on one side, pink/orange and Playfair Display serif
on the other. That seam is the single loudest "assembled in pieces" signal on the site.

## Research — what a case study page is judged on

| Source | Key takeaway |
|---|---|
| [uxfol.io case study template](https://blog.uxfol.io/ux-case-study-template/) | Fixed section order: Hero → **Overview** → Discovery → Process → Final design → **Impact** → **Learnings**. ~600 words. Overview must state role, team, timeline, tools as scannable data. Never show an image without a caption |
| [Case Study Club, top 20 portfolios](https://www.casestudy.club/journal/ux-designer-portfolio) | Simon Pan is the hiring-manager benchmark. Aleksi Tappura wins on "crisp typography". Common trait: "few, in-depth case studies, not a wall of thumbnails" |
| [UXPin, 16 portfolios that stand out to recruiters](https://www.uxpin.com/studio/blog/ux-portfolio-examples/) | Narrative writeups over screen galleries. Context and trade-offs must be legible |
| [2026 trend reports](https://uxpilot.ai/blogs/web-design-trends-2026) | Chrome/metallic/iridescent is the live aesthetic. Oversized plain sans over gradients. Kinetic scroll as chapter progression |

## Diagnosis of the three pages

| Criterion | WHO | MTN | IPL |
|---|---|---|---|
| Visual system matches homepage | Fail | Fail | Fail |
| **Overview block** (role, team, timeline, scope) | Fail | Fail | Fail |
| Process visible | Pass | Pass | Pass |
| Impact quantified | Pass | Partial | Pass |
| **Learnings section** | Fail | Fail | Fail |
| Reader knows how far in they are | Fail | Fail | Fail — MTN is 648 lines with no wayfinding |

The content is strong. Three things are missing, and all three are the ones the
research names explicitly: **who did what** at the top, **what I'd do differently**
at the bottom, and **a sense of position** in between.

## The approach: reskin, don't rewrite

The WHO page carries hard-won work, the PDF backgrounds, the mockup treatments,
the image sequencing. Rewriting it to a new class vocabulary would risk all of it
for no reader-visible gain. Instead a single `study.css` loads last and re-points
the old tokens at the chrome palette, then restyles the shared structural classes.
Colour and type unify in one file; layout is untouched.

## Colour and Typography — unchanged from v1

The chrome palette and Bricolage/Instrument/JetBrains Mono stack carry over
verbatim. The case studies adopt them; nothing new is introduced. The per-project
accent survives as a single hue swap on one variable, so WHO still reads teal-ward
and IPL still reads violet-ward without breaking the system.

## Patterns to add

1. **Scroll progress hairline** — a 2px chrome-gradient rule pinned to the top of
   the viewport. Answers "how long is this?" without a word of copy.
2. **At a glance** — a mono-labelled data strip directly under the hero: Role,
   Team, Timeline, Platform, Scope. This is the Overview section the template
   demands, compressed to something readable in four seconds.
3. **Learnings** — a closing section, first person, stating what changed in how
   I work. This is the section that separates a senior portfolio from a mid one.
4. **Unified masthead and footer** — the same chrome components as the homepage,
   so the frame never changes as you move between pages.

## Mood Keywords

Continuous · Engineered · Iridescent · Scannable · Senior

## What to Avoid

- Rewriting the WHO layout, the risk is all downside
- A second accent system per project, one variable swap is the whole budget
- Adding sections that repeat what the page already says well
