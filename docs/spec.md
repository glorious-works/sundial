# Sundial spec

Draft, 21 November 2026. Sundial is a Glorious Works web app on Vercel that does what everytimezone does, with two faults fixed: every row shows its own date, and the timeline is coloured by the real sky over each city. The name is a working title.

## Why

Keeping a spread of time zones in your head is hard because the gaps move. From London, Sydney is +11 hours from November to March, +10 for a week in spring and a month in autumn, and +9 for the rest of the year, and each change lands on a Saturday evening London time, so the first call to feel it is Monday's. The board should make that arithmetic unnecessary: one glance says what day and time it is everywhere, whether it is light there, and whether anyone is at work.

## What everytimezone gets wrong

Checked on Saturday 21 November 2026, in a logged-in view with a custom city list at 13:18 GMT and in a logged-out browser at 13:20 GMT, with the same result in both.

- **The date is a day behind on every row.** The times are right, but each row's now-line sits on the day pill labelled one day earlier: London at 13:18 is on "20 November", and Sydney at 00:18 is at the start of "21 November" when it is already Sunday 22nd. The pills start at the right local midnights, so the fault is in the date labels, and it is uniform across zones. It shows on a fresh load with the browser in Europe/London on GMT, so nothing exotic triggers it. The design also makes it hard to catch: the date appears only as a label floating mid-way along each grey pill, with no weekday, and the page header shows a six-day range ("November 19 – 24") rather than today.
- **Colour.** Every day is the same grey pill with faint shading. Nothing says that Sydney's 07:00 is already bright in November or that London is dark by 16:30.
- **Also missing:** weekdays (London's Friday evening is Sydney's Saturday morning), the size of each gap, and any warning that a gap is about to change.

## Principles

1. **Every row owns its date.** Weekday and date are worked out per row from the instant and the row's IANA zone, never by adding an offset to a shared date, and they show at the cursor and at each local midnight. The only page-level date is today in the home zone, labelled as such.
2. **Colour is the sky; shape is the working day.** Hue and brightness come from the sun's real elevation over that city at that moment, so they are right for the season and the latitude. Working hours are drawn as a separate bar, so the two never compete for meaning.
3. **The gap is a fact that changes.** Each row shows its offset from home and warns before it moves.
4. **Your board lives with you.** No account and nothing stored on a server: the roster lives in the link and the browser, so neither the repo nor the deploy holds anybody's names.

## The board

- **Rows.** Each row shows its label (city, plus an optional personal label), the local time at the cursor in large type, weekday and date (with "+1 day" or "−1 day" when it differs from home), an offset badge ("+11h"), and the sky state and working status at the cursor ("Twilight · off work"). Beside it sits a horizontal strip with the row's own midnights marked and labelled "Sun 22 Nov"; the day containing the strip's left edge keeps a sticky label.
- **Home.** The browser's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) is the home row, pinned first, with a manual override. Other rows follow in order of offset.
- **Default roster.** A first visit shows the home zone plus London, New York and Sydney (proposal). Anyone's own roster lives in their link.
- **Cursor.** One cursor, fixed at the centre of every strip, starts at now and follows the clock. Drag a strip or scroll sideways to move time, click a moment to centre it, use the arrow keys for 15 minutes (Shift for an hour), and press Now to return. Every row's time, weekday and date update with it.
- **Colour model.** Sun elevation is calculated client-side for each slice of the strip and each city's coordinates, then mapped to bands that blend into a gradient rather than blocks. Palette, from the Glorious Works brand:

  | Sun elevation | Band | Colour |
  | --- | --- | --- |
  | below −12° | Night | Cobalt dark `#142A7A`, deepening to `#0B1A52` |
  | −12° to −0.833° | Twilight | Cobalt `#3A62D0`, through violet near the horizon |
  | −0.833° to 6° | Sunrise / sunset | Dawn rose `#E0607E` to `#F2895A`; dusk Tomato `#C83C25` to `#E4672E` |
  | above 6° | Day | Signal yellow `#FEC94E`, paling to `#FFE3A0` at high sun |

  The bands also step in brightness from dark to light, so they read without relying on hue. Exact stops are in the prototype and are tuned there first, in light and dark themes. A zone with no known coordinates gets a neutral strip.
- **Working hours.** A bar under each strip, 09:00 to 17:30 Monday to Friday by default and editable per row, absent at weekends.
- **Overlap.** Columns where every row is inside working hours are highlighted. When there are none, the board says so and falls back to shared waking hours, 07:00 to 22:00 by default. For London, Chicago and Sydney in November that fallback finds London 20:00 to 22:00, which is Sydney 07:00 to 09:00 the next morning and Chicago 14:00 to 16:00.
- **Gap changes.** When any row's offset from home changes within the next four weeks of the cursor, a line under the row says when and to what, for example "Gap becomes +9h on Sat 3 Apr at 17:00 London time". Days of 23 and 25 hours render at their true length.
- **Copy a time.** A one-line summary of the cursor time, ready to paste, for example "Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago". Rows whose date differs from home's carry their date in brackets.
- **Adding a city.** A search box over a curated city list holding name, country, IANA zone and coordinates. Abbreviations such as AEDT are displayed but never accepted as input, since they are ambiguous.
- **Phone.** Each label stacks above its strip, and the layout must work at 375px, because a phone is where most checking happens.

## Date rules and acceptance tests

All arithmetic happens on instants, with conversion to wall-clock time through the zone as the last step. No `new Date("YYYY-MM-DD")`, which parses as UTC midnight, and no hand-held offsets. Nothing time-dependent renders on the server: the page ships static and fills in times after hydration, so no build-time or server clock can be frozen into the HTML.

Unit tests run on fixed instants; Playwright runs the same cases with its `timezoneId` set to Europe/London, America/Chicago and Australia/Sydney. Every row below was verified against the IANA database on 21 November 2026.

| London | Sydney | Chicago | What it checks |
| --- | --- | --- | --- |
| Sat 21 Nov 2026 13:13 GMT | Sun 22 Nov 00:13 AEDT | Sat 21 Nov 07:13 CST | Rows disagree on date and weekday; each cursor sits on its own row's day |
| Mon 23 Nov 2026 07:00 GMT | Mon 23 Nov 18:00 AEDT | Mon 23 Nov 01:00 CST | Copy line text |
| Fri 27 Nov 2026 22:00 GMT | Sat 28 Nov 09:00 AEDT | Fri 27 Nov 16:00 CST | Sydney row shows the weekend, with no working bar |
| Sat 3 Apr 2027 16:59 BST | Sun 4 Apr 02:59 AEDT | Sat 3 Apr 10:59 CDT | Gap +10 |
| Sat 3 Apr 2027 17:00 BST | Sun 4 Apr 02:00 AEST | Sat 3 Apr 11:00 CDT | Gap +9; Sydney repeats an hour (25-hour day) |
| Sat 2 Oct 2027 17:00 BST | Sun 3 Oct 03:00 AEDT | Sat 2 Oct 11:00 CDT | Gap +10; Sydney skips an hour (23-hour day) |

Two more. First, the everytimezone regression: on first render, with no interaction, every row's cursor sits inside the day its own label names, so at Sat 21 Nov 2026 13:18 GMT London reads Sat 21 and Sydney Sun 22. Second, with the browser in Australia/Sydney, the home row is Sydney and "today" is Sydney's date.

London's gaps for the coming year, from the same check:

| From (London time) | Sydney | Delhi | Chicago | Los Angeles |
| --- | --- | --- | --- | --- |
| 21 Nov 2026 | +11 | +5:30 | −6 | −8 |
| Sun 14 Mar 2027 | +11 | +5:30 | −5 | −7 |
| Sun 28 Mar 2027 | +10 | +4:30 | −6 | −8 |
| Sat 3 Apr 2027, 17:00 | +9 | +4:30 | −6 | −8 |
| Sat 2 Oct 2027, 17:00 | +10 | +4:30 | −6 | −8 |
| Sun 31 Oct 2027 | +11 | +5:30 | −5 | −7 |
| Sun 7 Nov 2027 | +11 | +5:30 | −6 | −8 |

Delhi never changes its clocks, so its gap moves only when London's does.

## Stack

- **App:** Next.js (App Router), TypeScript and Tailwind, as one static page with no API routes, no database and no environment variables.
- **Time:** the Temporal API, with a polyfill where the browser lacks it, or `Intl.DateTimeFormat` offsets as the prototype does; either way the acceptance tests decide.
- **Sun:** `astronomy-engine`, or the prototype's low-precision solar position if it stays within a fraction of a degree.
- **Cities:** a curated JSON list, small enough to ship with the page and grown on demand.
- **State:** the roster in the URL hash, which browsers never send to the server, mirrored to `localStorage`. Personal labels stay in `localStorage` unless the user chooses to put them in a link. One bookmarked link per device replaces an account.
- **Type:** Barlow, Barlow Condensed and League Gothic, as on glorious.works.
- **Tests:** Vitest and Playwright as above, run in CI.
- **Hosting:** Vercel, on a subdomain such as `time.glorious.works`. The Hobby plan covers non-commercial use, which this is while nothing sells.

## Project conventions

- **Public repo, personal data out.** No real people's names, employers or personal rosters in code, defaults, test fixtures or commit history.
- **AI label.** The footer carries "Made with AI: colophon", linking to https://glorious.works/colophon/, and the colophon gains a line for the app, because its "no JavaScript and no cookies" claim describes the site, while the app runs JavaScript and keeps settings in `localStorage`.
- **Commits and merges.** Commits are authored as `Glorious Works <hello@glorious.works>`, set in the repo's git config. PRs are merged locally with `git merge --ff-only` on `main` and then pushed, never with GitHub's merge button or `gh pr merge`, because GitHub authors those commits as whoever merges.
- **Works.** Sundial is listed in the Works section of glorious.works only once it is in real use.

## Out of scope for v1

Accounts and any sync beyond the link, calendar integration, meeting polls, per-person availability, notifications and a native app.

## Open questions

1. **Name.** Sundial is a working title.
2. **Licence.** Recommend none for now (readable, not reusable) until there is a reason to let others reuse the code.
3. **Subdomain.** `time.glorious.works` unless there is a better one.
4. **Default roster** for first-time visitors: the proposal above.
