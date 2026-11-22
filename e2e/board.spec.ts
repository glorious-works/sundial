import { expect, test, type Page } from "@playwright/test";

// docs/spec.md, "Date rules and acceptance tests": the same cases as the unit tests, run with
// the browser's timezoneId set to each project's zone (see playwright.config.ts).

const LON = "Europe/London";
const SYD = "Australia/Sydney";
const CHI = "America/Chicago";
const BOARD = "#cities=london-gb,sydney-au,chicago-us";
const LONDON_HOME = `${BOARD}&home=london-gb`;

// The production build carries GoatCounter's pixel; tests must never count as page views.
test.beforeEach(async ({ context }) => {
  await context.route("https://gloriousworks.goatcounter.com/**", (route) => route.abort());
});

async function open(page: Page, at: number, hash = "") {
  await page.clock.setFixedTime(new Date(at));
  await page.goto("./" + hash);
  await expect(page.locator("canvas.strip").first()).toHaveAttribute("data-cursor-day", /.+/);
}

const row = (page: Page, zone: string) => page.locator(`[data-testid=row][data-zone="${zone}"]`).first();

async function expectReading(page: Page, zone: string, date: string, time: string) {
  const r = row(page, zone);
  await expect(r.getByTestId("time")).toHaveText(time);
  await expect(r.locator("[data-testid=date] > span").first()).toHaveText(date);
  // The strip's own label for the day under the cursor names the same day.
  await expect(r.locator("canvas.strip")).toHaveAttribute("data-cursor-day", date);
}

test.describe("spec acceptance table", () => {
  test("Sat 21 Nov 2026 13:13 GMT: rows disagree on date and weekday", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 13), BOARD);
    await expectReading(page, LON, "Sat 21 Nov", "13:13");
    await expectReading(page, SYD, "Sun 22 Nov", "00:13");
    await expectReading(page, CHI, "Sat 21 Nov", "07:13");
  });

  test("Mon 23 Nov 2026 07:00 GMT: copy line text", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page, Date.UTC(2026, 10, 23, 7), LONDON_HOME);
    const line = "Mon 23 Nov, 07:00 London / 18:00 Sydney / 01:00 Chicago";
    await expect(page.getByTestId("copy-line")).toHaveText(line);
    await page.getByRole("button", { name: "Copy" }).click();
    await expect(page.locator(".toast")).toHaveText("Copied");
    await expect(page.getByTestId("announce")).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(line);
  });

  test("Fri 27 Nov 2026 22:00 GMT: Sydney row shows the weekend, with no working bar", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 27, 22), BOARD);
    await expectReading(page, LON, "Fri 27 Nov", "22:00");
    await expectReading(page, SYD, "Sat 28 Nov", "09:00");
    await expectReading(page, CHI, "Fri 27 Nov", "16:00");
    await expect(row(page, SYD).getByTestId("state")).toContainText("weekend");
    await expect(row(page, SYD).locator("canvas.strip")).toHaveAttribute("data-working", "no");
    await expect(row(page, CHI).locator("canvas.strip")).toHaveAttribute("data-working", "yes");
  });

  test("Sat 3 Apr 2027 16:59 BST: gap +10, with the change ahead", async ({ page }) => {
    await open(page, Date.UTC(2027, 3, 3, 15, 59), LONDON_HOME);
    await expectReading(page, SYD, "Sun 4 Apr", "02:59");
    await expectReading(page, CHI, "Sat 3 Apr", "10:59");
    await expect(row(page, SYD).getByTestId("badge")).toHaveText("+10h");
    await expect(row(page, SYD).getByTestId("gapnote")).toHaveText("Gap becomes +9h on Sat 3 Apr at 17:00 London time");
  });

  test("Sat 3 Apr 2027 17:00 BST: gap +9; Sydney repeats an hour (25-hour day)", async ({ page }) => {
    await open(page, Date.UTC(2027, 3, 3, 16), LONDON_HOME);
    await expectReading(page, LON, "Sat 3 Apr", "17:00");
    await expectReading(page, SYD, "Sun 4 Apr", "02:00");
    await expectReading(page, CHI, "Sat 3 Apr", "11:00");
    await expect(row(page, SYD).getByTestId("badge")).toHaveText("+9h");
    await expect(row(page, SYD).locator("canvas.strip")).toHaveAttribute("data-cursor-day-hours", "25");
  });

  test("Sat 2 Oct 2027 17:00 BST: gap +10; Sydney skips an hour (23-hour day)", async ({ page }) => {
    await open(page, Date.UTC(2027, 9, 2, 16), LONDON_HOME);
    await expectReading(page, LON, "Sat 2 Oct", "17:00");
    await expectReading(page, SYD, "Sun 3 Oct", "03:00");
    await expectReading(page, CHI, "Sat 2 Oct", "11:00");
    await expect(row(page, SYD).getByTestId("badge")).toHaveText("+10h");
    await expect(row(page, SYD).locator("canvas.strip")).toHaveAttribute("data-cursor-day-hours", "23");
  });
});

test.describe("home and today", () => {
  test("the everytimezone regression: on first render each cursor sits in its own row's day", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), BOARD);
    await expectReading(page, LON, "Sat 21 Nov", "13:18");
    await expectReading(page, SYD, "Sun 22 Nov", "00:18");
    await expectReading(page, CHI, "Sat 21 Nov", "07:18");
  });

  test("the browser's zone is the home row, and today is its date", async ({ page }, info) => {
    const zone = info.project.name;
    await open(page, Date.UTC(2026, 10, 21, 13, 18), BOARD);
    const home = page.locator("[data-testid=row][data-home]");
    await expect(home).toHaveCount(1);
    await expect(home).toHaveAttribute("data-zone", zone);
    await expect(page.getByTestId("row").first()).toHaveAttribute("data-zone", zone);
    const today = { [LON]: "Today in LondonSaturday 21 November", [CHI]: "Today in ChicagoSaturday 21 November", [SYD]: "Today in SydneySunday 22 November" }[zone];
    await expect(page.getByTestId("today")).toHaveText(today!);
  });

  test("a first visit shows only the home zone, with the city search open", async ({ page }, info) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18));
    const homeName = { [LON]: "London", [CHI]: "Chicago", [SYD]: "Sydney" }[info.project.name]!;
    await expect(page.getByTestId("row")).toHaveCount(1);
    await expect(page.getByTestId("row")).toHaveAttribute("data-name", homeName);
    await expect(page).toHaveURL(/\/sundial\/$/);
    const search = page.getByRole("combobox", { name: "Add a city" });
    await search.fill("Delhi");
    await search.press("Enter");
    await expect(page.getByTestId("row")).toHaveCount(2);
    await expect(page).toHaveURL(/#cities=delhi-in$/);
  });

  test.describe("a browser in India", () => {
    // Chrome reports this zone by its old name, Asia/Calcutta.
    test.use({ timezoneId: "Asia/Kolkata" });

    test("finds its city, with a real sky, and adding Delhi gives no second row", async ({ page }, info) => {
      test.skip(info.project.name !== LON, "the zone is set here, so one project is enough");
      await open(page, Date.UTC(2026, 10, 21, 13, 18));
      const home = page.getByTestId("row");
      await expect(home).toHaveCount(1);
      await expect(home).toHaveAttribute("data-zone", "Asia/Kolkata");
      await expect(home).toHaveAttribute("data-name", "Kolkata");
      await expect(home.getByTestId("state")).not.toContainText("Sky unknown");
      const search = page.getByRole("combobox", { name: "Add a city" });
      await search.fill("Delhi");
      await search.press("Enter");
      await expect(page.getByTestId("row")).toHaveCount(1);
      await expect(page.getByTestId("row")).toHaveAttribute("data-name", "Delhi");
      await expect(page.getByTestId("row")).toHaveAttribute("data-home", "true");
    });
  });
});

test.describe("overlap", () => {
  test("London, Chicago and Sydney in November fall back to shared waking hours", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 23, 7), LONDON_HOME);
    await expect(page.getByTestId("overlap")).toHaveText(
      "No shared working hours on Mon 23 Nov. Shared waking hours, 07:00 to 22:00: 20:00–22:00 London / 07:00–09:00 Sydney (Tue 24 Nov) / 14:00–16:00 Chicago",
    );
  });

  test("a roster with no shared waking hours gets the best time and who is outside", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 9), "#cities=new-york-us,london-gb,delhi-in,tokyo-jp,sydney-au&home=london-gb");
    await expect(page.getByTestId("overlap")).toHaveText(
      "No hour suits everyone on Sat 21 Nov. Best: 11:30 London, with New York up early (06:30) and Sydney up late (22:30).",
    );
  });

  test("shared working hours are named when there are some", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 23, 7), "#cities=london-gb,paris-fr&home=london-gb");
    await expect(page.getByTestId("overlap")).toHaveText("Shared working hours on Mon 23 Nov: 09:00–16:30 London / 10:00–17:30 Paris");
  });
});

test.describe("not now", () => {
  test("a moved cursor is marked: Back to now names the distance, and screen readers hear the new time", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    await expect(page.getByTestId("live")).toHaveAccessibleName("Live: showing now");
    await page.getByRole("region", { name: /Time zone board/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("live")).toContainText("Back to now");
    await expect(page.getByTestId("distance")).toHaveText("+12 min");
    await expect(page.locator("section.board")).toHaveClass(/not-live/);
    await expect(page.getByTestId("announce")).toHaveText("Sat 21 Nov, 13:30 London / 00:30 Sydney (Sun 22 Nov) / 07:30 Chicago");
  });

  test("dates in another year carry the year", async ({ page }) => {
    await open(page, Date.UTC(2026, 11, 31, 23, 30), LONDON_HOME);
    await expect(row(page, LON).locator("[data-testid=date] > span").first()).toHaveText("Thu 31 Dec");
    await page.getByRole("button", { name: "Forward one hour" }).click();
    await expect(row(page, LON).locator("[data-testid=date] > span").first()).toHaveText("Fri 1 Jan 2027");
    await expect(page.getByTestId("copy-line")).toHaveText("Fri 1 Jan 2027, 00:30 London / 11:30 Sydney / 18:30 Chicago (Thu 31 Dec 2026)");
    await expect(page.getByTestId("overlap")).toHaveText(
      "No shared working hours on Fri 1 Jan 2027. Shared waking hours, 07:00 to 22:00: 20:00–22:00 London / 07:00–09:00 Sydney (Sat 2 Jan 2027) / 14:00–16:00 Chicago",
    );
  });

  test("coming back after 30 minutes away returns the board to now", async ({ page }) => {
    const at = Date.UTC(2026, 10, 21, 13, 18);
    await open(page, at, LONDON_HOME);
    await page.getByRole("button", { name: "Forward one hour" }).click();
    await expect(row(page, LON).getByTestId("time")).toHaveText("14:15");
    const setVisibility = (state: string) =>
      page.evaluate((s) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);
    await setVisibility("hidden");
    await page.clock.setFixedTime(new Date(at + 10 * 60e3));
    await setVisibility("visible");
    await expect(row(page, LON).getByTestId("time")).toHaveText("14:15"); // ten minutes is not away
    await setVisibility("hidden");
    await page.clock.setFixedTime(new Date(at + 45 * 60e3));
    await setVisibility("visible");
    await expect(row(page, LON).getByTestId("time")).toHaveText("14:03");
    await expect(page.getByTestId("live")).toHaveAccessibleName("Live: showing now");
  });
});

test.describe("moving time", () => {
  test("arrow keys move 15 minutes, Shift an hour, and Live returns to now", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    await page.getByRole("region", { name: /Time zone board/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(row(page, LON).getByTestId("time")).toHaveText("13:30");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(row(page, LON).getByTestId("time")).toHaveText("14:30");
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(row(page, LON).getByTestId("time")).toHaveText("12:30");
    await page.getByTestId("live").click();
    await expect(row(page, LON).getByTestId("time")).toHaveText("13:18");
  });

  test("a right-click on a strip moves nothing; a click there does", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    const strip = page.locator("canvas.strip").first();
    const box = (await strip.boundingBox())!;
    const position = { x: box.width * 0.8, y: box.height / 2 };
    await strip.click({ button: "right", position });
    await expect(page.getByTestId("live")).toHaveAccessibleName("Live: showing now");
    await strip.click({ position });
    await expect(page.getByTestId("live")).toContainText("Back to now");
  });

  test("dragging a strip moves every row together", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    const strip = row(page, LON).locator("canvas.strip");
    const box = (await strip.boundingBox())!;
    const pph = box.width / 36; // desktop width shows 36 hours
    await page.mouse.move(box.x + box.width / 2, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 3 * pph, box.y + 30, { steps: 8 });
    await page.mouse.up();
    await expectReading(page, LON, "Sat 21 Nov", "16:15");
    await expectReading(page, SYD, "Sun 22 Nov", "03:15");
  });
});

test.describe("editing and persistence", () => {
  test("add, label, reorder and remove cities; the link and the browser both keep the board", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    await page.getByRole("button", { name: "Edit board" }).click();

    const search = page.getByRole("combobox", { name: "Add a city" });
    await search.fill("AEDT");
    await expect(page.getByText(/Zone abbreviations such as AEDT are ambiguous/)).toBeVisible();
    await search.fill("tok");
    await expect(page.getByRole("option").first()).toContainText("Tokyo, Japan");
    await search.press("Enter");
    await expect(row(page, "Asia/Tokyo")).toBeVisible();
    // Added by offset: Tokyo (+9) goes before Sydney (+11).
    await expect(page).toHaveURL(/#cities=london-gb,tokyo-jp,sydney-au,chicago-us&home=london-gb$/);

    await page.getByLabel("Label for Sydney").fill("Office");
    await expect(row(page, SYD).locator(".personal")).toHaveText("Office");
    await expect(page).not.toHaveURL(/Office/);

    await page.getByRole("button", { name: "Move Chicago up" }).click();
    await page.getByRole("button", { name: "Move Chicago up" }).click();
    await page.getByRole("button", { name: "Remove Tokyo" }).click();
    await expect(page).toHaveURL(/#cities=london-gb,chicago-us,sydney-au&home=london-gb$/);
    // Focus moves on to the next row rather than falling to the page.
    await expect(page.getByRole("button", { name: "Remove Sydney" })).toBeFocused();

    // Each row's controls name their city.
    await expect(page.getByRole("group", { name: "Chicago working hours" }).locator("input")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Make home: Sydney" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "No working hours for Sydney" })).not.toBeChecked();

    await page.getByLabel("Chicago working hours start").fill("08:00");
    await expect(page).toHaveURL(/chicago-us@0800-1730/);

    await page.getByLabel("Put personal labels in the link").check();
    await expect(page).toHaveURL(/sydney-au~Office/);

    // A bare address brings back this browser's board.
    await page.goto("./");
    await expect(page.getByTestId("row")).toHaveCount(3);
    await expect(page).toHaveURL(/#cities=london-gb,chicago-us@0800-1730,sydney-au~Office&home=london-gb$/);
    await expect(row(page, SYD).locator(".personal")).toHaveText("Office");
  });

  test("removing the last city closes edit mode, and adding one does not reopen it", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), "#cities=tokyo-jp");
    await page.getByRole("button", { name: "Edit board" }).click();
    await page.getByRole("button", { name: "Remove Tokyo" }).click();
    await expect(page.getByTestId("row")).toHaveCount(1);
    await expect(page.getByRole("combobox", { name: "Add a city" })).toBeFocused();
    await expect(page.getByLabel("Put personal labels in the link")).toHaveCount(0);
    await expect(page.getByText(/This device.s zone/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Done|Edit board)$/ })).toHaveCount(0);
    const search = page.getByRole("combobox", { name: "Add a city" });
    await search.fill("Tokyo");
    await search.press("Enter");
    await expect(page.getByRole("button", { name: "Edit board" })).toBeVisible();
    await expect(page.getByTestId("row-editor")).toHaveCount(0);
  });

  test("the city search puts its results away when left, and a click on one still adds it", async ({ page }) => {
    await open(page, Date.UTC(2026, 10, 21, 13, 18), LONDON_HOME);
    const search = page.getByRole("combobox", { name: "Add a city" });
    await expect(search).not.toHaveAttribute("aria-controls");
    await search.fill("tok");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(search).toHaveAttribute("aria-controls", (await page.getByRole("listbox").getAttribute("id"))!);
    await search.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(search).toHaveValue("tok");
    await search.focus();
    await page.getByRole("option", { name: /Tokyo, Japan/ }).click();
    await expect(row(page, "Asia/Tokyo")).toBeVisible();
    await expect(search).toHaveValue("");
  });

  test("the board works at 375px with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page, Date.UTC(2026, 10, 21, 13, 18), BOARD);
    await page.getByRole("button", { name: "Edit board" }).click();
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll).toBe(client);
    await expectReading(page, SYD, "Sun 22 Nov", "00:18");
  });
});

test.describe("static page", () => {
  test("the page-view pixel is not preloaded ahead of the page", async ({ request }) => {
    const html = await (await request.get("./")).text();
    expect(html).toContain("gloriousworks.goatcounter.com/count");
    expect(html).not.toMatch(/<link[^>]+goatcounter/);
    expect(html).not.toMatch(/HL\[[^\]]*goatcounter/);
  });

  test("ships no time: nothing time-dependent is in the HTML", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("./");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
    expect(text).not.toMatch(/Today in/);
    await expect(page.getByTestId("row")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Made with AI: colophon" })).toHaveAttribute("href", "https://glorious.works/colophon/");
    // The page-view pixel names the path only, never a board.
    await expect(page.locator("img.counter")).toHaveAttribute("src", "https://gloriousworks.goatcounter.com/count?p=%2Fsundial%2F&t=Sundial");
    await context.close();
  });
});
