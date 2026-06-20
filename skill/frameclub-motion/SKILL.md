---
name: frameclub-motion
description: FrameClub/LETSMOVIE motion system for React, Tailwind, and CSS keyframe work. Use when Codex needs to choose, review, create, refactor, or modify animations for FrameClub components, including movie cards, search results, tickets, bottom sheets, overlays, poster reveal effects, archived activity exits, transition timing, easing, opacity, scale, translate, or keyframes. Also use when it is unclear which existing animation preset should apply.
---

# FrameClub Motion

Use this skill to keep FrameClub animations consistent. This is a project-specific motion standard, not a general animation style guide.

## Required Workflow

Before editing animation code:

1. Search existing motion implementation first.
   - Search terms: `motion`, `animate`, `transition`, `keyframes`, `opacity`, `scale`, `translate`, `duration`, `ease`, `sheet`, `ticket`, `movie-card`, `selected`, `reveal`, `archive`.
   - Check `src/index.css` for keyframes and shared animation classes.
   - Check likely React components before adding new animation classes.
   - Check page and overlay containers for the shared `phone-canvas` /
     `phone-fixed` sizing classes before changing layout or motion.
2. Reuse an existing preset when the scene matches one below.
3. If the scene does not clearly match a preset, ask the user before deciding.
4. Do not invent a near-duplicate duration, easing curve, or keyframe sequence without a clear reason.

## Canvas Standard

All LETSMOVIE screens are designed against one fixed prototype canvas:

- width: `393px`
- height: `852px`

Every page canvas, full-screen overlay, modal layer, sheet layer, reveal layer,
and ticket layer must preserve this exact 393 x 852 frame. Do not use viewport
height as the canvas height. `100dvh`, `min-h-dvh`, `inset-y-0`, or full-window
fixed positioning may only be used outside the phone canvas as a browser-centering
shell, never as the measured app canvas.

Implementation expectation:

- Page root shell centers the prototype frame in the browser.
- The app frame itself uses the shared `phone-canvas` class.
- Full-screen layers inside the app use `phone-fixed` or an equivalent
  `absolute inset-0` layer inside `phone-canvas`.
- Do not create a page-specific canvas height unless the user explicitly changes
  the prototype size.

## Motion Philosophy

- Slow enough to feel cinematic, never twitchy.
- No bounce unless the user explicitly asks for it.
- Prefer `ease-out` or `cubic-bezier(0.16, 1, 0.3, 1)` for reveals.
- Use paired enter and exit animations for dismissible surfaces.
- Movie posters are the hero; motion should reveal them, not compete with them.

## Presets

### `movieCard.ritualSelected`

Use only for:

- voting selection
- final selected movie

Behavior:

- card lifts upward
- card rotates very slightly
- burgundy outline and shadow appear
- burgundy overlay fades in
- heart indicator appears in the top-right corner

Current parameters to preserve:

- Card transform: `translateY(-7px)` plus a small rotation.
- Transform transition: `520ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Shadow transition: `420ms ease`.
- Overlay transition: `opacity`, `300ms`, with a short delay.
- Heart transition: `scale-75 opacity-0` to `scale-100 opacity-100`, `300ms`, with `cubic-bezier(0.22, 0.9, 0.3, 1.15)`.

Do not use this preset for:

- movie search result selection
- activity mode selection
- form selection
- ordinary selected states

If a selected movie card is not in voting or final-selected state, use another preset or ask the user.

### `movieCard.searchSelected`

Use for movie search selection in both:

- create activity flow
- in-activity recommendation sheet

These two places must share the same rule.

Before selected:

- use the default movie search card
- do not show a plus button by default

After selected:

- show burgundy outline and shadow
- fade in a burgundy overlay
- do not lift
- do not rotate
- do not show the top-right heart

This is a lighter selection state than `movieCard.ritualSelected`.

### `posterReveal`

Use for poster or hero visual reveal in:

- activity card poster reveal
- activity detail hero poster reveal
- ticket poster or ticket main visual reveal

Behavior:

- poster fades from dim to clear
- saturation and brightness ease into the final look
- no abrupt image swap

Prefer the existing language of `activity-card-poster-reveal` and `selected-hero-in` in `src/index.css`.

Ticket containers may still use `ticket.enter`; the poster inside the ticket should use `posterReveal`.

### `ticket.enter`

Use for every ticket appearing:

- immediate ticket after leaving a memory
- ticket opened from "My Memories"

Container motion:

- `opacity: 0` to `opacity: 1`
- `translateY(28px)` to `translateY(0)`
- `500ms cubic-bezier(0.16, 1, 0.3, 1)`

Ticket exit for detail-page return now uses `detailPage.exit`. Do not create a
separate ticket/detail exit.

### `detailPage.exit`

Use for:

- activity detail page returning to the activity list
- memory detail page returning to the memories list
- activity detail page after dissolving/removing an activity
- memory detail page after removing a memory

Behavior:

- activity detail and memory detail must share exactly the same exit animation
- return and remove flows from these detail pages must share exactly the same
  exit animation
- cinematic and slightly held, matching the ticket-like exit feeling
- fade out while moving downward

Current parameters to preserve:

- `420ms cubic-bezier(0.7, 0, 0.84, 0)`
- `opacity: 1` to `opacity: 0`
- `translateY(0)` to `translateY(28px)`

Do not use this for:

- bottom sheets
- archived list item removal
- ticket enter
- movie reveal roll

When a destructive action is launched from a bottom sheet on a detail page, the
sheet exits first with `bottomSheet.standard`, then the detail page exits with
`detailPage.exit`, then the deletion/navigation side effect runs. Never delete
and navigate immediately after the sheet exit if the matching detail page has a
reusable exit animation.

### `bottomSheet.standard`

Use for all bottom sheets:

- recommendation sheet
- date or time picker sheet
- memory sheet
- activity action sheet
- memory action sheet
- lightweight participant or upload sheet when it appears from the bottom

Sheet enter:

- `translateY(100%)` to `translateY(0)`
- `300ms cubic-bezier(0.16, 1, 0.3, 1)`

Sheet exit:

- `translateY(0)` to `translateY(100%)`
- `300ms cubic-bezier(0.7, 0, 0.84, 0)`

Overlay:

- must animate together with the sheet
- enter: `opacity 0` to `opacity 1`, `300ms ease-out`
- exit: `opacity 1` to `opacity 0`, `300ms ease-in`

Never make a dismissible bottom sheet disappear instantly.

### `listItem.archiveExit`

Use for list item removal in:

- activity archived after memory is created
- activity dismissed or dissolved
- memory removed

Behavior:

- faster and lighter than the old heavy archive animation
- `300ms`
- slight upward movement
- fade out

Do not use this for page return, modal close, or ticket exit.

## Negative Rules

- Do not apply `movieCard.ritualSelected` to search result cards.
- Do not show plus buttons on default unselected movie search cards.
- Do not add lift, rotation, or a heart to search selection.
- Do not make sheets or overlays vanish without their exit animation.
- Do not create a new timing curve when an existing preset applies.
- Do not let LETSMOVIE page canvases drift from 393 x 852.
- Do not use viewport height as the app canvas height.
- Do not alter layout while only changing motion.
- Do not decide an ambiguous animation mapping yourself; search this skill, inspect existing code, then ask the user if still unclear.

## Implementation Notes

- Prefer shared CSS classes and keyframes in `src/index.css` for reusable motion.
- Component-local Tailwind transitions are acceptable for tiny interaction states, such as `active:scale`.
- Keep animation names semantic: `posterReveal`, `ticketEnter`, `bottomSheetStandard`, `archiveExit`.
- If unifying old animation classes, preserve current behavior first, then rename only when safe.
- Respect `prefers-reduced-motion` behavior already present in `src/index.css`.
