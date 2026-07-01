# Original PIXI UI — Style Reference

Extracted from the legacy Pixi GUI (`src/Gui/*`, `src/Game/Graphics/Resource.ts`,
`index.html`) so the new Vue + Nuxt UI chrome can replicate the original look as
closely as possible.

## Typography
- Font family: **Arial** (`Main.GLOBAL_FONT = "Arial"`). No custom font asset.
- Button label size: **11px**, color **`#573D40`** (dark brown).

## Color palette (from Gui hex constants, by frequency)
| Hex | Use |
|-----|-----|
| `#242930` | dominant dark chrome — panel / menu background, text on light |
| `#fdf9ea` | cream / parchment — light panel fill, text on dark |
| `#43366f` | deep purple — accents, headers |
| `#a08ed2`, `#b7aae3` | light purples — secondary accents |
| `#feb584` | peach / warm highlight |
| `#4c3d57` | muted purple-gray |
| `#573d40` | button label text |
| `#ffffff` | white |

From `index.html`: page background `#686d77`, play-area background `#9ea2c2`.

## Buttons (glossy rounded "pill" textures)
Each has **base** (idle) / **roll** (hover) / **click** (active) states, as PNGs in `resource/`:
- `button_purple_{base,roll,click}.png` (primary), `button_red_*` (destructive/important)
- `button_blue_*`, `button_pink_*`, `button_orange_*`
- `button_play_*` (sim start), `button_x_*` (close)
- `button_arrowup_*`, `button_arrowdown_*`, `button_purplearrow_*`

Faithful approach: import the PNGs via Vite (`import url from '.../button_purple_base.png'`)
and use as backgrounds with the label overlaid in `#573D40` Arial 11px; swap to
`_roll` on hover and `_click` on active. Where a texture can't stretch to the
needed size, CSS-approximate the glossy pill (rounded ~6px, top-light vertical
gradient in the family color, subtle inner highlight + 1px darker border).

## Panels & frames
IMPORTANT layout rule for the NEW build:
- **PANELS get the background + border styling** (menu bar, tool palette, part
  inspector, status bar): cream `#fdf9ea` content areas and/or dark `#242930`
  chrome bars, WITH borders (purple/dark edge, subtle bevel) — matching the
  original PIXI panels/windows (`GuiWindow.ts`, and the `box###` panel textures).
- **The main game canvas / stage area has NO border or frame styling.** It is a
  clean, borderless, full-bleed region that fills its container (responsive — not
  fixed 800×600). Do not wrap it in `box_small.png` or any border-image.

Assets (for reference / decorative panel use only):
- `site-resource/box_small.png` — the ornate 9-patch the ORIGINAL used around the
  game area (`index.html` `#game_box`, slice `15 23 24 15`). In the new build,
  reuse it only as a decorative PANEL border if desired — NOT around the canvas.
- `resource/box{120,154,200,248,547}_{top,mid,bot}.png` — 3-slice vertical panel
  backgrounds (fixed width). CSS-recreate the paneled look from the palette
  instead of stretching these.
- Logo: `site-resource/logo.png` / `resource/incredibots2_logo.png`.

## Flexibility strategy — nine-patch vs CSS re-creation
The legacy textures are fixed-size or 3-slice, so for variable-size HTML chrome
they must be reworked. Measured dimensions and the recommended approach per asset:

| Asset | Size | Sliceable? | Approach |
|-------|------|-----------|----------|
| `button_*_base/roll/click` | 102×35 (play 86×43) | pill, fixed | **CSS-recreate** the glossy pill (rounded ~17px, top-light vertical gradient in the family color, 1px darker border, inner highlight). Fully flexible + crisp. Keep PNGs as visual reference. Alternatively a horizontal 3-slice `border-image` with ~17px end-caps if pixel-exact texture is required. |
| `box547_{top,mid,bot}` etc. | 557×{15,1,24} | vertical 3-slice, fixed width | **CSS-recreate** panels (rounded rect, `#242930` frame / `#fdf9ea` content, subtle border). The strips are fixed-width and don't nine-slice to arbitrary width. |
| `box_small.png` | 39×40, slice `15 23 24 15` | **true 9-patch** | Reuse directly as `border-image` for the ornate play-area frame (as `index.html` already does). Fully flexible. |
| arrows `button_arrow*` (22×19), `button_x_*`, `button_play_*` | small, fixed | Use at native size as icons, or recreate as SVG/CSS. |

Net: reuse `box_small.png` as a genuine nine-patch `border-image`; CSS-recreate
buttons and panels from the palette for flexibility; keep small icons as fixed
PNGs. Encode the button/panel looks as reusable CSS classes (or Nuxt UI theme
overrides) so every component shares them.

## Mapping to Nuxt UI
- Set app theme via `vite.config` `ui.theme.colors` / `app.config.ui` and CSS vars:
  primary ≈ purple `#a08ed2`/`#43366f`, neutral ≈ `#242930`, plus custom accent
  tokens for red/peach.
- Prefer Nuxt UI components for structure; override their `class`/`ui` slots (or a
  scoped stylesheet) to hit the palette above. Reuse the real PNG assets for
  buttons, logo, and frames wherever practical rather than re-inventing them.
