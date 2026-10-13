# Portfolio Website — Plan

Vanilla HTML/CSS/JS portfolio for stevenbleau.com, hosted on GitHub Pages.
Target audience: hiring managers for senior industrial/product design and product engineering roles.
Tone: understated senior — let depth of process, tradeoffs, and outcomes speak; no self-labeling.

---

## 1. Guiding principles

- **Content is the design.** Senior signal comes from case study quality (problem → constraints → decisions → tradeoffs → measured outcomes), not visual theatrics.
- **Everything committed is what ships.** No build step, no `package.json`, no `dist/`.
- **Performance is a feature.** Homepage <100KB HTML/CSS/JS, Lighthouse 95+ mobile, JS budget ~5KB total.
- **Progressive enhancement.** Every feature works with JS disabled; JS only adds polish.
- **Accessibility is non-negotiable.** WCAG AA, keyboard operable, semantic HTML.

## 2. Stack constraints (hard rules)

| Rule | Value |
|---|---|
| Frameworks / bundlers / npm runtime deps | None |
| Fonts | System font stack (decided). No Google Fonts, no self-hosted fonts |
| JS budget | ~5KB minified on the homepage (`main.js` only). `gate.js` (~1.6KB) loads *only* on gated case study pages, so it sits outside the homepage budget |
| Stylesheet | Single `css/style.css`, ~15KB max |
| Images | WebP (AVIF optional), hero/OG <200KB, in-page <100KB, explicit `width`/`height` |
| Hosting | GitHub Pages, `main` branch, site root, `CNAME` → `stevenbleau.com` |
| Analytics | None, or one lightweight option (Plausible). No trackers/cookie banners |
| Forbidden | Hero video, scroll-jacking, parallax, markdown renderers at runtime |

## 3. Repo structure

```
/
├── index.html                  # Home: hero + work carousel + bio + contact
├── 404.html
├── CNAME                       # stevenbleau.com
├── favicon.svg
├── apple-touch-icon.png
├── og-image.jpg                # 1200x630, <200KB
├── sitemap.xml                 # live pages only, excludes _archive
├── robots.txt
├── css/style.css
├── js/carousel.js              # drag + arrows, progressive enhancement only
├── js/main.js                  # nav toggle, theme, misc (<2KB)
├── assets/
│   ├── carousel/               # homepage carousel thumbnails only (rendered size x2 max)
│   ├── work/<slug>/            # per-case-study images (hero.webp, 01-problem.webp, ...)
│   └── ui/                     # logo, icons, textures
└── work/
    ├── <slug>/index.html       # one folder per live case study → /work/<slug>/
    └── _archive/               # drafts + retired projects; authored in draft.md;
                                # not linked, excluded from sitemap
```

Routing: folder + `index.html` everywhere → clean URLs, no `.html` anywhere.
About lives inline on the homepage at `#about` — there is no `/about/` page.

## 4. Content inventory (migrated from current site)

Current site (Webflow): nav = Home / Portfolio / Showcase / About; categories = Industrial Design, UX/UI, Service Design, Instructional Design, Web Development, Robotics.

### Case study candidates (from current portfolio grid)

| Project | Category | Notes |
|---|---|---|
| Y-Cane | Industrial Design | Strong standalone project — lead candidate |
| Apple Stethoscope | Industrial Design | Concept/brand work |
| Ossur Ibex | Industrial Design | Medical device, real program — senior signal |
| Logitech Depth Camera | Industrial Design | Consumer electronics, real program |
| Fetchbot / Fetchbot 2.0 | Robotics | Iteration story = great tradeoffs narrative; merge into one case study |
| Scout 50cc | Industrial Design | |
| VL Inflatable | Industrial Design | |
| Pigeon | Industrial Design | |
| Fair Anita Display | Industrial/Service | |
| Maker Bootcamp | Instructional Design | Shows teaching/leadership |
| Tradeout | UX/UI | Digital work — breadth |
| Matrix Display | UX/UI | |

### Launch selection (decided)

Ship **2 deep case studies** in v1; 3rd added later — not 13 shallow ones:

| # | Case study | Slug | Notes |
|---|---|---|---|
| 1 | Y-Cane (Telo Design) | `y-cane` | Flagship physical product; Telo founder-led story lives here |
| 2 | Makerspaces program + curriculum | `makerspaces-program` | Program manager role: built curriculum + program; may absorb "Maker Bootcamp". Show scope, curriculum architecture, outcomes (learners, cohorts, adoption) |
| 3 | RedGroup | `redgroup` | **Password-gated placeholder.** NDA client work; copy still to write |
| 4 | Medtronic | `medtronic` | **Password-gated placeholder.** NDA client work; copy still to write |

### Password-gated case studies

NDA work is encrypted at build time, not hidden client-side — GitHub Pages serves
everything committed, including `work/_archive/`, so a hidden `<div>` or an
unlinked file protects nothing.

- `work/_archive/_tools/encrypt.py` → AES-GCM + PBKDF2-SHA256 (250k iters), emits base64
- Page ships ciphertext only, in `data-enc`; `js/gate.js` decrypts in-browser
- Gated pages are `noindex` and excluded from `sitemap.xml`
- **`PASSWORDS.md` and `*.fragment.html` are gitignored** — committing either defeats the gate
- Protection equals password strength; it is not a substitute for a real auth server

Everything not selected → `work/_archive/` with `draft.md` stubs, promoted later when written up.
Balance note: CS1 = industrial design craft, CS2 = program/curriculum leadership. For the deferred #3: Ossur Ibex or Logitech Depth Camera add design breadth; Fetchbot adds engineering depth.

### Home/About copy seeds (rewrite for senior tone)

- Positioning: full-stack product designer — B.S. Product Design (Univ. of Minnesota), Full-Stack cert, M.S. Robotics. Founded and led product development at Telo Design. Experience across Fortune 500, consultancies, startups, non-profits across medtech, transportation, consumer.
- Rewrite rules: drop "Hey there!"-style openers; lead with what and for whom, not adjectives. Keep claim "full stack product designer" as a capability statement backed by the story, not a title badge.
- Showcase page: dropped in v1; any strong visuals from it fold into carousel thumbnails or case study images.
- Contact: `mailto:` link, not a Webflow form (forms need a service; spec bans extra scripts).

## 5. Case study template — SUPERSEDED

The public site is **not** case-study-driven (see "Content model pivot" below). The
template below is retained for the interview deck and for archived pages under `work/_archive/`:

1. Hero image (`eager` + `fetchpriority="high"`, one `<h1>` with project name)
2. Context strip — role, year, team, client/NDA status, one-line outcome
3. Problem
4. Process (concise, evidence-backed: sketches, CAD, prototypes, research artifacts)
5. Decisions & tradeoffs (the section that reads "senior" — write 2–3 real tradeoffs per project)
6. Outcome / metrics (shipped units, adoption, test results; honest "what I'd change")
7. Next-projects footer nav (prev/next + home link)

Authoring: copy lives in `work/_archive/<slug>/draft.md` as source of truth; hand-converted to HTML. No client-side markdown rendering.

## 6. Homepage design contract

**Content model pivot (2026-10-11):** most of the best work is confidential (unreleased
Telo products, RedGroup, Medtronic). The site is a **visual gallery + experience/education
narrative**, not case studies: the resume gets past ATS; the site shows caliber in seconds
and adds personal context; full case studies (incl. the AES-gated pages) are presented in
interviews. All four public case/gated pages were moved to `work/_archive/` and dropped
from the sitemap.

- `header/nav` — logo mark + wordmark; links: Work (`#work`, the collage), Experience (`#previously`), Education (`#education`), About (`#about`), Contact (`#contact`). No hamburger — 5 uppercase links fit, tighter `--s2` gap below 52rem.
- Hero — full-bleed collage gallery (sketches/renders/apps in one burst) + typed black-block lines. No video, no parallax.
- Currently (`.01`, `#currently`) — 2 entries: **Telo Design** (founder, startup + R&D; links to live Telo site) and **Design Curriculum & Programs** (University of Minnesota, `.work-gallery` photo strip: hero + 01-problem + 02-process). No case-study links.
- Previously (`.02`, `#previously`) — 3 cards: RedGroup (dark logo plate), Medtronic (logo plate), Studio 04 (transportation design, text plate). 2–3 sentence write-ups; role/dates as `[TODO]`. No links.
- Education (`.03`, `#education`) — 3-step timeline (`.edu`): B.S. Product Design → full-stack bootcamp → M.S. Robotics, closing line on the full-stack design-engineer throughline.
- About — condensed bio + headshot, inline at `#about` (no standalone page; the old one is parked in `work/_archive/about-page/`).
- Contact footer — `mailto:`, LinkedIn, resume link (PDF in `assets/ui/`).
- `prefers-reduced-motion` respected globally: no smooth-scroll, no transitions.

## 7. CSS system

- **Cache busting:** `style.css` and the JS files are linked with `?v=N`. Browsers
  (and GitHub Pages' CDN) will otherwise serve a stale stylesheet against fresh
  HTML, which renders as half-applied styles. **Bump `N` in every page whenever
  `style.css`, `main.js` or `gate.js` changes** — there's no build step to hash it.
- Single `style.css`; `:root` custom properties for color, spacing (8px scale), type scale.
- Layout: header and footer bars are full-bleed (`.wrap--bleed`, one `--gutter` from each viewport edge); reading content sits in a centred `.wrap` (`--wrap` 96rem + gutters). `.hero-collage` bleeds full-width.
- Fluid type + layout with `clamp()` + CSS grid; max 2 breakpoints, only where content breaks.
- Dark mode via `prefers-color-scheme` only (no toggle in v1).
- Verify WCAG AA contrast in both schemes; visible `:focus-visible` styles site-wide.

## 8. Accessibility & SEO checklist (every page)

- [ ] Semantic landmarks; one `<h1>`; no skipped heading levels
- [ ] Skip-to-content link
- [ ] `alt` on meaningful images; `alt=""` on decorative
- [ ] Meta title + description + Open Graph tags
- [ ] Carousel keyboard-operable (native scroll + arrow buttons with `aria-label`s)
- [ ] Explicit `width`/`height` on all `<img>`; `loading="lazy"` below fold
- [ ] `sitemap.xml` lists live pages only; custom `404.html`

## 9. Phases

### Phase 0 — Content & decisions gate (blocks everything after)
- [x] Launch case studies picked: v1 = Y-Cane + Makerspaces Program; 3rd deferred (Ossur Ibex / Logitech Depth Camera / Fetchbot)
- [x] Decisions locked: Showcase page dropped in v1 (folded into home carousel); system font stack (no `fonts/` folder); GitHub Pages user-site repo (`username.github.io`) + `CNAME` → stevenbleau.com
- [ ] Inventory image assets exportable from current Webflow site (need originals, not screenshots) for Y-Cane + Makerspaces Program
- [x] **2026-10-11 pivot:** NDA reality kills the public case-study model → gallery + Currently/Previously/Education (see §6). Y-Cane, Makerspaces, and the RedGroup/Medtronic gate pages archived; Telo site linked from the Currently card.

### Phase 1 — Skeleton & system ✅ built
- [x] Init repo: `main` branch, `CNAME`, `404.html`, `robots.txt`, `favicon.svg` (+ `.gitignore`; first commit pending)
- [x] `style.css` design tokens + type scale + dark mode + base layout (now ~17.8KB, over the 15KB soft target — hero-collage + retained gate/case styles; revisit trim at Phase 5)
- [x] Shared header/footer markup pattern (copy-paste include — no templating, it's <10 pages)
- [x] Skip-link, focus styles, reduced-motion baseline

### Phase 2 — Homepage ✅ built (superseded layout)
- [x] Hero + bio + contact footer
- [x] Hero is now the full-bleed collage gallery + typed lines (replaced carousel); `carousel.js` deleted
- [x] Currently / Previously / Education sections built (§6 pivot); cards' copy carries `[TODO]` role/dates
- [x] Thumbnails/collage tiles: WebP, lazy below the fold

### Phase 3 — Case studies — ARCHIVED, not shipped publicly
- [x] Structural template built for `y-cane` + `makerspaces-program` → moved to `work/_archive/`
- [x] RedGroup/Medtronic AES-gated pages → moved to `work/_archive/` (interview deck via `encrypt.py` + `PASSWORDS.md`)
- [ ] Optional: author `draft.md` facts for interview-version pages

### Phase 4 — About + supporting pages ✅ built
- [x] About folded into the homepage (`#about`); standalone `/about/` removed and archived
- [x] `og-image.jpg` (1200x630, 54KB), per-page meta + OG tags
- [x] `sitemap.xml`: homepage-only after the pivot; `_archive` excluded

### Phase 5 — Hardening & ship
- [ ] Lighthouse mobile 95+ on homepage; JS/CSS budget check (`wc -c`, minified sizes); decide on trimming unused case/gate CSS (over 15KB target)
- [ ] Keyboard-only walkthrough + VO pass
- [ ] Test with JS disabled (gallery, nav, sections still usable)
- [ ] Deploy to Pages, verify CNAME/HTTPS, `404.html` live
- [ ] Optional: Plausible snippet (one line) if analytics wanted

## 10. Definition of done

- v1 public site: gallery + Currently (Telo, UMN) + Previously (RedGroup, Medtronic, Studio 04) + Education; no case-study pages linked; real role/dates filled into every `[TODO]`; Telo URL confirmed
- Homepage under 100KB HTML/CSS/JS (excl. images); Lighthouse 95+ mobile
- No console errors, works JS-off, AA contrast, clean URLs, sitemap accurate
- Hiring-manager test: within 60 seconds of landing, a reviewer sees craft (gallery), current work (Telo + UMN), past employers, and the education throughline — and knows how to make contact
