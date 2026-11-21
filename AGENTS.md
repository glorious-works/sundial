<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# sundial

Sundial, a time zone board for Glorious Works: every row keeps its own date, and every strip is coloured by the real sun over that city. `docs/spec.md` is the source of truth, and its acceptance tests define done for the date logic.

**Stack:** Next.js 16 (App Router) as a static export (`output: "export"`, `basePath: "/sundial"`), TypeScript, Tailwind 4. One static page, no API routes, no database, no env vars. Hosting: SiteGround, at https://glorious.works/sundial/ (Stephan, 21 Nov 2026), alongside the Hugo site from glorious-works/site.

## Key files
- `docs/spec.md`: the spec. Its date rules and acceptance tables are mirrored in the unit and Playwright tests.
- `docs/prototype.html`: Stephan's single-file prototype, where the sky palette and strip drawing are tuned first. **Git-ignored and never committed**: its city list is a personal roster.
- `src/lib/time.ts`: instants, wall clocks per IANA zone (`Intl.DateTimeFormat` offsets), gap changes, day bounds (23- and 25-hour days), labels.
- `src/lib/sun.ts`: low-precision solar elevation (checked against `astronomy-engine` in its test) and the sky colour stops.
- `src/lib/hours.ts`, `src/lib/board.ts`: working and waking hours, the overlap finder, the copy line, the gap note.
- `src/lib/strip.ts`: everything a strip draws. `cursorDay` is what the first-render regression tests check.
- `src/lib/roster.ts`: the board's settings, `DEFAULT_ROSTER`, the link format (`#cities=london-gb,sydney-au@0800-1630~Label&home=london-gb`) and localStorage (`sundial:v1`).
- `src/lib/cities.ts`, `src/data/cities.json`: the curated city list and search.
- `src/components/Sundial.tsx`: the page shell; the board mounts only after hydration. `Board.tsx` (rows, cursor, editing), `drawStrip.ts` (canvas), `CitySearch.tsx`.
- `e2e/board.spec.ts`, `playwright.config.ts`: Playwright, one project per zone (Europe/London, America/Chicago, Australia/Sydney). `e2e/serve.mjs` serves `out/` at `/sundial/` for it, the way SiteGround does (`npm run serve` to look at the export by hand).
- `.github/workflows/ci.yml` (the `check` job) and `.github/workflows/publish.yml` (deploys `main` to SiteGround).

## Conventions and gotchas
- Public repo: no real people's names, employers or personal rosters in code, defaults, test fixtures or commit history. Tests use cities and neutral labels such as "Office".
- Date rules: all arithmetic on instants, wall time from the zone as the last step. No `new Date("YYYY-MM-DD")` and no hand-held offsets. A row's weekday and date come from its own zone, never from adding an offset to a shared date.
- Nothing time-dependent renders at build: the board mounts only after hydration, and a Playwright test checks the exported HTML holds no dates. The route table must show `/` as `○`; a static export fails the build on anything dynamic. (`cacheComponents`, which would also catch a prerender reading the clock, cannot be used with a static export.)
- Every URL lives under `/sundial/`. Use relative or `basePath`-aware links (`next/link`, metadata files), never a bare `/path`.
- City ids are part of every saved link: never rename or remove one. Add cities on demand; the unit test checks each zone is valid. Zone abbreviations are displayed, never accepted as search input.
- Sky colour stops change in the prototype first, in light and dark themes, then here.
- The footer reads "Made with AI: colophon" and links to https://glorious.works/colophon/.
- Commits are authored as `Glorious Works <hello@glorious.works>`, set in this repo's git config. Keep it. Merge PRs locally (`git merge --ff-only` on `main`, then push), never with GitHub's merge button or `gh pr merge`, which author the commit as whoever merges.
- There is no global git credential helper, so push with `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`.
- Secrets live in a git-ignored `.env` / `.env.local`; `.env.example` lists every variable the code reads (none). Never put a secret in a command line or a committed file.

## Verify
Run these before committing; CI runs the same ones. They must pass on `main`.
```bash
npm ci
./node_modules/.bin/tsc --noEmit
npm run lint
npm test
npm run build
npm run test:e2e   # Playwright against the export in out/, in London, Chicago and Sydney
```
First run on a machine: `npx playwright install chromium`.

## Session sync (local and cloud)
Work on this repo happens both on Stephan's laptop and in Claude Code cloud sessions, and each side only sees what is pushed to GitHub. Cloud sessions start from the default branch, so unmerged PR branches and unpushed local commits are invisible to them.
- **At the start of a session:** run `git fetch`, then check whether the current branch is behind or ahead of its remote, whether the working tree has uncommitted changes, and whether there are open PRs (`gh pr list`) from other sessions. Report anything out of line before changing code. (Local sessions get this from a SessionStart hook; cloud sessions must do it themselves.)
- **Before ending a session:** commit and push the work, or open a PR, so the other side can see it. If anything is left uncommitted or unpushed, say so.

## Deploy (SiteGround, at glorious.works/sundial)
- **Publishing is the Publish workflow** (`.github/workflows/publish.yml`): on every push to `main`, and by hand from the Actions tab, it builds the export and rsyncs `out/` into `SG_PATH/sundial/` on SiteGround by checksum, with `--delete` confined to that folder, then flushes the SiteGround cache (domain id 1, as the site does) and checks that https://glorious.works/sundial/ answers 200. So **`main` is what is live**.
- It needs the `SG_USER`, `SG_HOST`, `SG_PORT`, `SG_PATH`, `SG_DEPLOY_KEY` and `SG_KNOWN_HOSTS` secrets on this repo, the same values as glorious-works/site, ideally with a deploy key of its own; it fails with an error naming any that is missing.
- The site repo's `deploy-exclude.txt` must list `/sundial/`, or the site's own `rsync --delete` removes Sundial on its next publish (every morning at 06:15 UTC).
- SiteGround caches static files for a long time. Next.js fingerprints everything under `_next/static/`, and the workflow flushes the cache after any change, so `index.html` is fresh too. To check what visitors get, fetch the plain URL: a query string bypasses the cache.
- `main` has a ruleset: the `check` job must pass on a commit before it can reach `main`, and force-pushes and deletion are blocked. Work on a branch, open a PR so CI runs, then `git merge --ff-only` it into `main` locally and push. Never enable auto-merge.
- The Vercel project `sundial` (team `stephanburns-projects`, https://sundial-orpin.vercel.app) was the first deploy. It is to be deleted once glorious.works/sundial is live (Stephan, 21 Nov 2026); it is not connected to the repo and gets nothing new.
- Sundial reads no env vars and has no server, so there is nothing else to configure.
