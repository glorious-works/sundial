# Sundial

A time zone board for [Glorious Works](https://glorious.works). Every row keeps its own date, and every strip is coloured by the real sun over that city.

- Each row shows its local time, weekday and date, its gap from home, and whether it is light there and working hours.
- Drag a strip, scroll sideways, click a moment or use the arrow keys to move time; every row moves together.
- Gaps that change within four weeks are announced, and 23- and 25-hour days are drawn at their true length.
- The board lives in the page's link and in your browser. There is no account and nothing is stored on a server.

The spec is [docs/spec.md](docs/spec.md).

## Run it

```bash
npm ci
npm run dev
```

Checks: `./node_modules/.bin/tsc --noEmit`, `npm run lint`, `npm test`, then `npm run build && npm run test:e2e` (Playwright; first run `npx playwright install chromium`).

Made with AI: [colophon](https://glorious.works/colophon/).
