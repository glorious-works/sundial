import { defineConfig, devices } from "@playwright/test";

const PORT = 3218;

// The spec's cases run with the browser in each of these zones. The app is tested as built
// (`npm run build` first): e2e/serve.mjs serves the static export at /sundial/, as SiteGround does.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Trailing slash: tests navigate relative to it, as in page.goto("./#cities=…").
  use: { baseURL: `http://localhost:${PORT}/sundial/`, trace: "retain-on-failure" },
  projects: ["Europe/London", "America/Chicago", "Australia/Sydney"].map((timezoneId) => ({
    name: timezoneId,
    use: { ...devices["Desktop Chrome"], timezoneId, locale: "en-GB" },
  })),
  webServer: {
    command: `node e2e/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/sundial/`,
    reuseExistingServer: !process.env.CI,
  },
});
