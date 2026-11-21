import { defineConfig, devices } from "@playwright/test";

const PORT = 3218;

// The spec's cases run with the browser in each of these zones. The app is tested as built
// (`npm run build` first), so what is checked is the static page that ships.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: ["Europe/London", "America/Chicago", "Australia/Sydney"].map((timezoneId) => ({
    name: timezoneId,
    use: { ...devices["Desktop Chrome"], timezoneId, locale: "en-GB" },
  })),
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
