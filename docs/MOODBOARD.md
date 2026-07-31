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
