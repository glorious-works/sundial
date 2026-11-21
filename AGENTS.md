<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# sundial

Sundial, a time zone board for Glorious Works: every row keeps its own date, and every strip is coloured by the real sun over that city. `docs/spec.md` is the source of truth, and its acceptance tests define done for the date logic.

**Stack:** Next.js 16 (App Router, `cacheComponents` on), TypeScript, Tailwind 4. One static page, no API routes, no database, no env vars. Hosting: Vercel.

## Key files
- `docs/spec.md`: the spec.
- `docs/prototype.html`: Stephan's single-file prototype. **Git-ignored and never committed**: its city list is a personal roster.

## Conventions and gotchas
- Public repo: no real people's names, employers or personal rosters in code, defaults, test fixtures or commit history.
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
```

## Session sync (local and cloud)
Work on this repo happens both on Stephan's laptop and in Claude Code cloud sessions, and each side only sees what is pushed to GitHub. Cloud sessions start from the default branch, so unmerged PR branches and unpushed local commits are invisible to them.
- **At the start of a session:** run `git fetch`, then check whether the current branch is behind or ahead of its remote, whether the working tree has uncommitted changes, and whether there are open PRs (`gh pr list`) from other sessions. Report anything out of line before changing code. (Local sessions get this from a SessionStart hook; cloud sessions must do it themselves.)
- **Before ending a session:** commit and push the work, or open a PR, so the other side can see it. If anything is left uncommitted or unpushed, say so.

## Deploy checklist (Vercel)
- Every env var the code reads is set **in Vercel** for Production (and Preview if used), not just in `.env.local`. Sundial reads none; keep it that way.
- Read the `next build` route table: `○` = static, frozen at build time; `ƒ` = rendered per request. Sundial is deliberately `○`: nothing time-dependent renders on the server, and every time is filled in after hydration.
