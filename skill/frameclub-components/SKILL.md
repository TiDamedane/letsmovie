---
name: frameclub-components
description: FrameClub/LETSMOVIE reusable UI component standards for React and Tailwind. Use when creating, modifying, or reviewing shared cards, centered dialogs, overlays, action buttons, avatar/member controls, or repeated component patterns in the LETSMOVIE app.
---

# FrameClub Components

Use this skill to keep reusable FrameClub UI surfaces from drifting into near-duplicate styles.

## Required Workflow

Before creating or changing a shared component:

1. Search for the existing pattern first.
   - Search terms: `ActionDialog`, `start-confirmation`, `phone-fixed`, `rounded-[32px]`, `bg-[#181b1f]`, `dialog`, `modal`, `overlay`, `avatar`, `member`.
   - Check `src/components` for reusable components before writing page-local markup.
   - Check `src/index.css` for shared animation classes before adding CSS.
2. Reuse the existing component when the surface matches an existing component contract.
3. If a new variant is necessary, add the variant to the shared component instead of copying a local fork.
4. For any animation change, read `skill/frameclub-motion/SKILL.md` first and preserve paired enter/exit behavior.

## Centered Action Dialog

Use `src/components/action-dialog.tsx` for centered modal cards such as:

- the "开始挑选" confirmation dialog
- the "邀请好友" dialog
- future short decision dialogs with an icon, compact copy, and one or two actions

Do not duplicate the outer wrapper, overlay, card shell, icon well, action row, or button classes inside page components.

Dialog shell contract:

- layer: `phone-fixed`, centered with `grid place-items-center px-6`
- overlay: `bg-black/58`
- card: `min-h-[286px]`, `w-[320px]`, `rounded-[32px]`, `bg-[#181b1f]`, same shadow and padding as `ActionDialog`
- animation classes: `start-confirmation-overlay`, `start-confirmation-overlay-closing`, `start-confirmation-dialog`, `start-confirmation-dialog-closing`

Action button contract:

- primary action: burgundy text on transparent background, `text-[#8b1e3f]`, `font-medium`, hover `bg-[#8b1e3f]/10`
- secondary action: warm white text on transparent background, `text-[#f8f4ed]`, `font-normal`, hover `bg-white/[0.05]`
- do not use a filled burgundy background for `ActionDialog` primary buttons unless the user explicitly changes the dialog system
- one-action dialogs use the same primary button style and the same content/action animation rules

Icon contract:

- use line icons with the same visual weight as the clapper, location, and calendar icons
- use `strokeWidth={1.6}` for Lucide or custom SVG icons unless matching an established nearby icon requires a tiny adjustment
- `Popcorn` from `lucide-react` is the default invite icon

## Avatar And Member Controls

All in-page avatars and avatar-like member controls are circular and fixed at `40px x 40px`.

Implementation expectations:

- image avatars, placeholder avatars, and invite/add avatar buttons all render as exactly `40px` by `40px`
- use `rounded-full` and `object-cover` for image-backed avatars
- keep host and member avatar sizing symmetrical unless the user explicitly asks for a hierarchy change

## Negative Rules

- Do not copy `ActionDialog` markup into a page component to make a small style tweak.
- Do not create a new modal overlay color for the same centered dialog pattern.
- Do not create a separate invite-dialog button palette.
- Do not let shared component variants drift from the existing motion skill.
