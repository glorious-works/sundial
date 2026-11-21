# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Stephan first: someone who keeps several cities on different continents in mind and checks, many times a week, what day and time it is in each, whether it is light there and whether anyone is at work. His board lives in one bookmarked link per device. The tool is public at glorious.works/sundial for anyone who juggles cities the same way; there are no accounts and no distinction between him and other visitors.

The checking mostly happens on a phone, at a glance; planning a call across zones happens at a desk.

## Product Purpose

A time zone board that makes the moving arithmetic of time zones unnecessary: one glance says what day and time it is everywhere, whether it is light there, and whether anyone is at work, and dragging the time shows the same for any other moment. Success is never having to work out a date or a gap by hand, and never being caught by a gap that changed.

## Positioning

1. **Every row owns its date.** Weekday and date are worked out per row from the instant and the row's own IANA zone, never by adding an offset to a shared date. This is the fault everytimezone has: on 21 Nov 2026 every row's date label there was a day behind.
2. **Colour is the sky.** Each strip is coloured by the sun's real elevation over that city at that moment, so it is right for the season and latitude. Working hours are drawn as a separate bar, so colour and shape never compete for meaning.
3. **The gap is a fact that changes.** Each row shows its offset from home, and a change within four weeks of the cursor is announced in home time ("Gap becomes +9h on Sat 3 Apr at 17:00 London time"). Days of 23 and 25 hours render at their true length.
4. **Your board lives with you.** No account and nothing stored on a server: the roster is in the page's link (the URL hash, which browsers never send) and mirrored in the browser's localStorage. Personal labels stay in the browser unless the user puts them in the link.

## Operating Context

- One page. Rows: home first (the browser's zone, or a city the user chose), then the user's cities. One cursor fixed at the centre of every strip; it follows the clock until moved by dragging, sideways scrolling, clicking, the arrow keys or the hour buttons, and returns with Live.
- A first visit shows only the home zone and the city search; people add the cities they keep track of from a curated list (name, country, zone, coordinates). Zone abbreviations such as IST are shown, never accepted as input, because they are ambiguous.
- The copy line ("Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago") is pasted into messages and invitations.
- The overlap line names shared working hours across every row, or says there are none and falls back to shared waking hours (07:00 to 22:00).
- Sharing a board means sharing its link.

## Capabilities and Constraints

- Static page: a Next.js static export served as plain files at glorious.works/sundial on SiteGround. No server code, no database and no environment variables. Page views are counted by GoatCounter's tracking pixel, as on the rest of glorious.works: the path only, never the board, and no cookies.
- Every time renders client-side after hydration; nothing time-dependent may be rendered at build.
- Date arithmetic on instants, wall time from the zone as the last step; the spec's acceptance tables (`docs/spec.md`) define correctness and are tested in Vitest and in Playwright with the browser in London, Chicago and Sydney.
- Out of scope for v1: accounts or sync beyond the link, calendar integration, meeting polls, per-person availability, notifications, a native app.
- The name Sundial is a working title.
- Public repository (MIT): no real people's names, employers or personal rosters in code, defaults, fixtures or history.

## Brand Commitments

- A Glorious Works product. Nothing sells: no prices, booking, ads or tips.
- The footer reads "Made with AI: colophon" and links to https://glorious.works/colophon/, the site's one AI disclosure.
- The spec fixes the sky colours to the Glorious Works palette (night cobalt, twilight cobalt, dawn rose, tomato dusk, signal yellow day) and the type to Barlow, Barlow Condensed and League Gothic, as on glorious.works. Exact sky stops are tuned in the (private) prototype first.
- Voice: plain British English, short sentences, no marketing.

## Evidence on Hand

- `docs/spec.md`: the spec, including the everytimezone check of 21 Nov 2026 and the verified acceptance and gap tables.
- No testimonials, users, usage numbers or press exist; do not invent any.

## Product Principles

1. Correct before clever: a wrong date is the one unforgivable failure, so every date shown comes from the row's own zone.
2. Glanceable on a phone: the answer is readable in one look at 375px.
3. Facts, not decoration: colour means the sky and the bar means working hours; nothing else competes with them.
4. Private by construction: the board lives in the link and the browser, never on a server.
5. Say what changes: gaps that move, days that are longer or shorter, and dates that differ from home are stated, not left to be noticed.

## Accessibility & Inclusion

WCAG 2.2 AA (Stephan, 21 Nov 2026): contrast, keyboard operation and screen-reader labels at AA. What the strips show by colour (sky state, working hours, day boundaries, shared hours) must also be available as text, and nothing may rely on hue alone.
