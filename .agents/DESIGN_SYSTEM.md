# Design system

Every piece of UI in Langdle follows the **neobrutalism** design of
[neobrutalism.dev](https://www.neobrutalism.dev/docs/installation): flat
colours, thick black borders, hard offset shadows, square-ish corners and bold
type. `core/components/ui` is our copy of that kit, built on
[Base UI](https://base-ui.com) primitives. Layout rules live in
[`ARCHITECTURAL_SPINE.md`](./ARCHITECTURAL_SPINE.md), code style in
[`CONVENTIONS.md`](./CONVENTIONS.md).

## Rules

1. **Reach for the kit first.** If `core/components/ui` has the component, use
   it. Do not rebuild a button, dialog or select out of raw elements.
2. **Missing component? Install it from neobrutalism.dev, do not invent one.**
   Every component in the catalogue below has a registry entry:

   ```bash
   pnpm dlx shadcn@latest add https://neobrutalism.dev/r/<name>.json
   ```

   Then fix what the CLI leaves behind: the file must land in
   `src/core/components/ui/`, import `cn` from `@/core/lib/utils`, import
   sibling components from `@/core/components/ui/…`, and pass
   `npx biome check --write`. Do not change its styling while installing it.
3. **Only when the catalogue has nothing close** may you write a new UI
   component — and it must be built from the tokens below so it looks like it
   came from the same kit.
4. **App components follow the same look.** Module components and the app
   shell (`core/components/main`) compose kit components; when they need custom
   markup (a feature chip, a guess row) they use the same tokens, not ad-hoc
   colours, radii or shadows.
5. **Customise at the call site, not in the kit.** Pass `className` (merged by
   `cn()`) or pick a variant. Edit a kit file only to fix a bug or to follow an
   upstream neobrutalism change, and then for every caller at once.
6. **Base UI, not Radix.** Use `@base-ui/react` primitives. Radix packages and
   `vaul` must not come back.

## Tokens

The theme is defined in `src/app/[locale]/globals.css` (`:root`, `.dark` and
`@theme inline`). Use these utilities instead of raw values:

| Concern | Use | Don't use |
| --- | --- | --- |
| Surfaces | `bg-background` (page), `bg-secondary-background` (cards, inputs), `bg-main` (accent / primary), `bg-overlay` (behind modals) | `bg-gray-*`, arbitrary hex/oklch |
| Text | `text-foreground`, `text-main-foreground` on `bg-main`, `text-soft-det` for muted eyebrows | `text-gray-*` |
| Borders | `border-2 border-border` (always 2px, always the border token) | `border` (1px), `border-black`, coloured borders for structure |
| Radius | `rounded-base` | `rounded-md/lg/xl` |
| Shadow | `shadow-shadow` (hard 4px offset, no blur) | `shadow-sm/md/lg`, blurred shadows |
| Weight | `font-base` (500) for body, `font-heading` (700) for titles and labels | `font-medium`, `font-semibold` |
| Focus | `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2` | removing focus styles |

Semantic status colours (the green / amber / red of the game's feature
matches) are the one allowed exception to the palette; they still sit inside
`border-2 border-border` shapes.

### The mobile mirror

The Flutter app restates these tokens in `mobile/lib/core/theme/tokens.dart`
(`NeoColors`, `Neo`, `NeoText`), converted from oklch to hex. Changing a colour,
the border width, the radius or the shadow in `globals.css` means changing
`tokens.dart` in the same change, or the two clients drift apart. The app's
widget kit and its rules are in [`MOBILE.md`](./MOBILE.md).

### Interaction pattern

Pressable elements show the shadow and "press" into it on hover:

```
shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
```

`reverse` buttons do the opposite (`hover:translate-x-reverseBoxShadowX
hover:translate-y-reverseBoxShadowY hover:shadow-shadow`). Elements that sit
flush in a bar (the header icons) use the `noShadow` variant. Don't add
scale, glow or colour-fade hover effects to pressable elements.

## Using the Base UI components

- **`render` instead of `asChild`.** To make a trigger be another component,
  pass it: `<DialogTrigger render={<Button variant='neutral' />}>Open</DialogTrigger>`.
  The children go on the trigger, not on the rendered element.
- **A link that looks like a button is a link.** Base UI's `Button` always sets
  `role="button"`, so never render a `Link` through it. Style the link instead:
  `<Link className={buttonVariants({ variant: 'neutral' })} href='/x'>`, and
  wrap in `cn(buttonVariants(...), '…')` when adding overrides.
- **`Select` gets `items`.** Pass `items={[{ value, label }]}` so
  `SelectValue` shows the label rather than the raw value. `onValueChange`
  may receive `null`; guard it.
- **State is in data attributes.** Style with `data-open`, `data-closed`,
  `data-checked`, `data-unchecked`, `data-highlighted`, `data-disabled`,
  `data-popup-open`, `data-starting-style` / `data-ending-style` — never
  `data-[state=…]`. Positioned popups expose `--anchor-width`,
  `--available-height` and `--transform-origin` (no `--radix-*` variables).
- **Other renames:** `TooltipProvider` takes `delay`; `Drawer` takes
  `swipeDirection` (`'right'`, `'down'`, …); `DialogContent` takes
  `showCloseButton`; change handlers receive an `eventDetails` second argument.
- Portals need the app root to be isolated: the `[locale]` layout wraps the app
  in an `isolate` div inside a `relative` body. Keep it that way.

## Catalogue

Components available from neobrutalism.dev (docs at
`https://www.neobrutalism.dev/docs/<name>`). **Bold** ones are already in
`core/components/ui`.

accordion, alert, alert-dialog, attachment, avatar, badge, breadcrumb,
bubble, **button**, button-group, calendar, card, carousel, chart,
**checkbox**, collapsible, combobox, **command**, context-menu, data-table,
date-picker, **dialog**, **drawer**, dropdown-menu, empty, field, form,
hover-card, image-card, **input**, input-group, input-otp, item, kbd,
**label**, marker, marquee, menubar, message, message-scroller,
native-select, navigation-menu, pagination, **popover**, progress,
questionnaire, radio-group, resizable, scroll-area, **select**, sheet,
sidebar, skeleton, slider, spinner, stars, **switch**, **table**, tabs,
textarea, toast, toggle, toggle-group, **tooltip**.

Toasts use `sonner` directly (`<Toaster />` in the layout, `toast.*` in
forms), as the `toast` docs page does.

## Existing drift

Some older app components predate these rules (e.g. `rounded-xl` and
`text-gray-700` in the options sidebar, a hand-styled `<textarea>` in the
change request dialog that the `textarea` component would replace). Do not
copy them. When you touch one of those files, bring the part you touch in line
with this document.
