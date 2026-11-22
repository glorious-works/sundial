---
name: Sundial
description: Every row keeps its own date, and every strip is coloured by the real sun over that city.
colors:
  signal-yellow: "#FEC94E"
  ink: "#1E1E1E"
  tomato: "#C83C25"
  cream: "#FFF8E7"
  deep-night: "#0B1A52"
  night-cobalt: "#142A7A"
  twilight-cobalt: "#3A62D0"
  dawn-rose: "#E0607E"
  dawn-amber: "#F2895A"
  dusk-orange: "#E4672E"
  high-sun: "#FFE3A0"
  bench-umber: "#655D4B"
  parchment-rule: "#E6DABD"
  pale-wheat: "#F4E8C8"
  night-bench: "#10131D"
typography:
  display:
    fontFamily: "League Gothic, Arial Narrow, Impact, sans-serif"
    fontSize: "clamp(56px, 9vw, 88px)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "0.01em"
  wordmark:
    fontFamily: "League Gothic, Arial Narrow, Impact, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "0.01em"
  reading:
    fontFamily: "League Gothic, Arial Narrow, Impact, sans-serif"
    fontSize: "46px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tnum"
  today:
    fontFamily: "League Gothic, Arial Narrow, Impact, sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  today-compact:
    fontFamily: "League Gothic, Arial Narrow, Impact, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0.08em"
  control:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0.06em"
  control-small:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.06em"
  tick:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  lede:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  swatch: "3px"
  badge: "4px"
  field: "6px"
  strip: "7px"
  panel: "8px"
  pill: "999px"
spacing:
  gutter: "16px"
  row: "14px"
  row-phone: "10px"
  column-gap: "22px"
  label-column: "210px"
components:
  button:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  button-hover:
    backgroundColor: "{colors.pale-wheat}"
    textColor: "{colors.ink}"
  button-active:
    backgroundColor: "{colors.parchment-rule}"
    textColor: "{colors.ink}"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-back-to-now:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.cream}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-small:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.control-small}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
    height: "32px"
  badge:
    backgroundColor: "{colors.pale-wheat}"
    textColor: "{colors.ink}"
    rounded: "{rounded.badge}"
    padding: "1px 7px"
  badge-home:
    backgroundColor: "{colors.tomato}"
    textColor: "{colors.cream}"
    rounded: "{rounded.badge}"
    padding: "1px 7px"
  field:
    backgroundColor: "#FFFDF6"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "5px 8px"
  edit-panel:
    backgroundColor: "{colors.pale-wheat}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
---

# Design System: Sundial

## Overview

**Creative North Star: "The Instrument on the Bench"**

Sundial is an instrument made on the Signal Bench, the workshop glorious.works describes. The page opens with the brand band in Signal Yellow, the wordmark in League Gothic and today's date in home time, and below it the instrument itself: a column of readings, one row per city, each with its own large time, its own weekday and date, and a strip of real sky running through a fixed cursor. The readings are the point; everything else is a tool for moving them.

When the cursor leaves now, the instrument goes into shade: the readings drop to Bench Umber and a Tomato "Back to now" names how far away the cursor is. The live board needs no announcement; the moved one always says so.

The page is calm and dense in the way a good gauge is: a lot of information, each piece in one place, nothing repeated for effect. Colour is rationed by meaning. The sky ramp belongs to the strips, where it is data (the sun's real elevation over that city), and Tomato marks what needs a look. The interface around the readings is quiet print on Cream, with controls that feel like real switches: firm, clearly pressed, never decorative.

Sundial rejects two looks outright: everytimezone's uniform grey day pills with floating date labels, where colour means nothing and the date has to be hunted for, and dashboard chrome, the cards, gradients and widget tiles of a generic SaaS panel.

**Key Characteristics:**
- One column of readings; the time in League Gothic is the largest thing in each row.
- The sky ramp appears only in the strips and their swatches, and always means the sun.
- Working hours are a separate ink bar, so shape and colour never compete.
- Tomato marks attention: the cursor, home, a date that differs, a gap about to change, hours everyone shares.
- Controls are tactile pills that lift on hover and press in when used.
- Not now is never quiet: shaded readings and a Tomato "Back to now" with the distance.
- Light and dark themes share every rule; only the ground and neutrals change.

## Colors

A warm print palette from glorious.works, with a sky ramp that only the strips may use.

### Primary
- **Signal Yellow** (#FEC94E): the brand band at the top of the page and the day band of the sky ramp. Nothing else on the page is yellow.
- **Ink** (#1E1E1E): all primary text, the working-hours bar, the cursor line and solid controls. In the dark theme Cream takes this role.

### Secondary
- **Tomato** (#C83C25; #E35A40 in the dark theme): the attention colour. It marks the cursor head, the Home badge, a "+1 day" that differs from home, the gap-change note, the live dot, the "Back to now" button, focus rings, the caret, and the outline and wash of hours everyone shares (or the best hour when none are). It is also the dusk stop of the sky ramp.

### Tertiary: the sky ramp (strips only)
- **Deep Night** (#0B1A52) to **Night Cobalt** (#142A7A): sun below −12°.
- **Twilight Cobalt** (#3A62D0), through violet near the horizon: −12° to −0.833°.
- **Dawn Rose** (#E0607E) to **Dawn Amber** (#F2895A) in the morning; **Tomato** to **Dusk Orange** (#E4672E) in the evening: −0.833° to 6°.
- **Signal Yellow** paling to **High Sun** (#FFE3A0): above 6°.

The bands also step from dark to light, so they read without relying on hue. Exact stops live in `src/lib/sun.ts` and are tuned in the prototype first, in both themes.

### Neutral
- **Cream** (#FFF8E7): the ground in the light theme; text on Ink, and on Tomato in the light theme (4.8:1).
- **Bench Umber** (#655D4B; #A8A28F in the dark theme): secondary text, hour ticks, the sticky day label, hints, placeholders, field borders (6.2:1, so fields read as fields), and the readings while the cursor is not now.
- **Parchment Rule** (#E6DABD; #262B3B dark): row dividers, the Live pill's quiet outline, the pressed state of a button.
- **Pale Wheat** (#F4E8C8; #1F2433 dark): offset badges, the edit panels, a button's hover, the highlighted search result.
- **Night Bench** (#10131D): the ground in the dark theme, and the text on its Tomato (5.1:1, where Cream would be 3.4:1). Night skies are close to it, so in the dark theme each strip carries a faint Cream hairline (22%) to keep its edge.

### Named Rules
**The Sky Is Data Rule.** The sky ramp is never decoration. It appears only in a strip or a swatch, and there it always means the sun's real elevation over that city at that moment. A zone without coordinates gets a neutral striped strip instead of a guessed sky.

**The Look Here Rule.** Tomato means "look here": the cursor, home, a date that differs from home, a gap about to change, shared hours, focus. It is never used for decoration, headings or plain emphasis.

## Typography

**Display Font:** League Gothic (with Arial Narrow, Impact)
**Body Font:** Barlow (with system-ui)
**Label/Control Font:** Barlow Condensed (with Arial Narrow)

**Character:** League Gothic gives the readings the presence of station-clock numerals; Barlow Condensed in spaced capitals labels and controls them like the engraving on a panel; Barlow carries the sentences. All three are open source and self-hosted.

### Hierarchy
- **Display** (400, clamp(56px, 9vw, 88px), 0.86, uppercase): the wordmark on a first visit, with a Tomato full stop.
- **Wordmark** (400, 36px, 0.86, uppercase): the wordmark in the slim bar once the board has cities.
- **Reading** (400, 46px, 1, tabular figures): each row's local time, the same size on phones. The largest thing in every row.
- **Today** (400, 30px, 1; 21px in the slim bar): today's date in home time in the brand band, the only page-level date.
- **Title** (600, 17px): each row's weekday and date.
- **Label** (600, 14px, 0.08em, uppercase): city names; the strip's day labels use the same face at 13px.
- **Control** (600, 14px, 0.06em, uppercase): buttons; 13px on the small row-edit buttons.
- **Lede** (400, 16px): the one sentence under the wordmark on a first visit.
- **Body** (400, 15px, 1.45): the copy line, the overlap line and help text; help is kept to 58ch (about 75 characters of Barlow).
- **Meta** (400, 13px): sky and work state, gap-change notes, the legend, hints. Hour ticks in the strips use Barlow Condensed at 11px (10px on phones), day labels 13px.

### Named Rules
**The Tabular Time Rule.** Every time and offset is set with tabular figures, so readings do not jitter as the cursor moves.

**The Year When It Matters Rule.** A date carries its year only when it is not in the current year for that row; the copy line then carries it too.

## Layout

A single centred column, at most 1200px wide, with a 16px gutter (or the safe-area inset, if larger). From the top:

1. **The brand band.** On a first visit it is full height, with the wordmark, the lede and today's date. Once the board has a city beside home it becomes a slim bar (36px wordmark, today's date at 21px on the right), because the board is then what people come for. The static page ships with the slim bar, so returning visitors see no jump.
2. **The time controls:** Live or Back to now, then −1h and +1h. Nothing else shares this row.
3. **The board.** Each row is a two-column grid: a 210px label column and the strip filling the rest, 22px apart, 14px of padding above and below, divided by Parchment Rule lines. Every strip has the same width, so a moment sits at the same x in every row and the cursor is one vertical line through the whole board.
4. **The add row:** the city search, always present, with Edit board beside it (and, while editing, the link and home options).
5. **The copy line** with its Copy button, then **the overlap line**, shown once there are two rows to compare.
6. The legend and the help text, then the footer.

Strips show 36 hours at 900px and wider, 30 hours from 520px, and 24 hours below that. At 640px and below each row puts the time (46px) beside its city, date and state, above a 64px strip, with 10px of padding: five cities fit on one 390x844 screen under the slim bar. Controls are at least 44px tall there. Nothing scrolls sideways at 375px.

## Elevation & Depth

The page is flat print, and the controls are physical. Rows, strips and text sit flat on the ground; depth in the readings comes only from the sky. Controls lift: a button rises 1px with a soft shadow on hover and presses 1px in, flat, when used (120ms, ease-out; no movement under reduced motion). The layers that float above the page, the search results and the toast, carry the Float shadow.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 3px 10px rgba(30, 30, 30, 0.16)`; `0 3px 12px rgba(0, 0, 0, 0.5)` in the dark theme): a button under the pointer.
- **Float** (`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12)`; 0.5 in the dark theme): the search results list and the toast.

### Named Rules
**The Flat Readings Rule.** Nothing in a row lifts or casts a shadow. Lift belongs to things you press and things that float.

## Shapes

Pills for anything you press (999px), small square-ish badges for facts (4px), gently rounded strips (7px) and edit panels (8px), fields at 6px. The sky strip is a single rounded band, cut by thin Cream midnight lines and the cursor's Cream slot; its corners are the only curves inside a row.

## Components

### Buttons
Tactile and confident: they look like switches and behave like them.
- **Shape:** full pill (999px), 1.5px Ink outline, at least 40px tall (44px on phones).
- **Default:** Cream fill with Ink text in condensed capitals (8px 16px).
- **Hover / Active / Focus:** Pale Wheat and a 1px lift with the Lift shadow on hover; pressed 1px in, flat, on Parchment Rule when active; a 2px Tomato focus ring offset by 3px.
- **Solid:** Ink fill with Cream text, for a mode that is on: Done while editing.
- **Live:** while the board follows the clock, a quiet pill with a Parchment Rule outline and a Tomato dot, named "Live: showing now".
- **Back to now:** when the cursor has moved, a Tomato pill with Cream text (Night Bench in the dark theme) and, after a hairline divider, the distance from now in tabular figures ("+3h 15m", "+108 days").
- **Small:** 13px text, 5px 12px, at least 32px tall (36px on phones), for row actions in the edit panel. Disabled at 35% opacity.

### Badges
- **Offset badge:** Pale Wheat, 4px radius, condensed 12px with tabular figures ("+11h", "−5h", "+5:30").
- **Home badge:** the same shape in Tomato with Cream text (Night Bench in the dark theme).

### Inputs / Fields
- **Style:** a slightly lighter field than the ground (#FFFDF6; #161A26 dark), 1.5px Bench Umber border, 6px radius, Barlow 15px, Bench Umber placeholder. The city search is 40px tall.
- **Focus:** the 2px Tomato ring and a Tomato caret.
- **Checkboxes:** 18px, in Ink (`accent-color`), with the whole label clickable.
- **Disabled:** the time fields when a row has no working hours, with a Parchment Rule border.

### City search
The combobox under the board. Results float on the Float shadow; each shows "City, Country" and, on the right, the zone abbreviation and the gap from home. Cities already on the board say "On the board" and are skipped by the highlight and the arrow keys. Typing an abbreviation in capitals (IST, CST) gets a hint instead of results.

### Row (signature)
The label column holds the city (a level-two heading, in spaced capitals) with an optional personal label in Bench Umber, the offset or Home badge, the time as a Reading, the weekday and date as a Title with "+1 day" or "−1 day" in Tomato when it differs from home, and a state line: a sky swatch, then "Twilight · off work". A gap-change note in Tomato follows when one is due. While the cursor is not now, the reading is Bench Umber.

### Sky strip (signature)
A canvas 78px high (64px on phones): day labels and midnight ticks along the top, the 34px sky band (26px on phones), the working-hours bar under it, and hour ticks below. The cursor is fixed at the centre: an Ink line, a Cream slot through the sky and a Tomato triangle on top. A day label that would run under the cursor or off the right edge moves to the other side of its midnight line, and hour ticks stay clear of the edges and the cursor. Hours everyone shares are washed in Tomato and outlined on the sky: solid for shared working hours, dashed for shared waking hours, and a fainter dashed wash for the best hour when nothing is shared.

## Do's and Don'ts

### Do:
- **Do** work out every weekday and date from the row's own zone, and label each midnight on the strip with that row's date ("Sun 22 Nov").
- **Do** keep the time the largest thing in each row, in League Gothic with tabular figures.
- **Do** say in text what the strip shows in colour: the sky state and work state sit under every time.
- **Do** keep Tomato for things that need a look, and keep the sky ramp inside the strips.
- **Do** check every change at 375px and in the dark theme.
- **Do** make a moved cursor obvious: shaded readings, a Tomato Back to now with the distance, and the year when it is not this year.

### Don't:
- **Don't** use uniform grey day pills or float a date label mid-way along a day: everytimezone's look, where colour means nothing and the date must be hunted for.
- **Don't** add dashboard chrome: cards around rows, gradients on the interface, widget tiles or decorative shadows.
- **Don't** colour anything outside a strip with the sky ramp, or use Tomato as decoration.
- **Don't** lift or shadow anything inside a row.
- **Don't** bake text into images; every label is live text.
