// Central Vite-resolved URLs for the legacy Pixi UI textures. Importing the
// PNGs here (rather than via CSS `url()`) guarantees Vite fingerprints them and
// they resolve correctly in both dev and the production build. Components bind
// these onto CSS custom properties so the shared button/frame styles can use
// them via `border-image-source: var(--...)`.

import purpleBase from "../../resource/button_purple_base.png";
import purpleRoll from "../../resource/button_purple_roll.png";
import purpleClick from "../../resource/button_purple_click.png";
import redBase from "../../resource/button_red_base.png";
import redRoll from "../../resource/button_red_roll.png";
import redClick from "../../resource/button_red_click.png";
import blueBase from "../../resource/button_blue_base.png";
import blueRoll from "../../resource/button_blue_roll.png";
import blueClick from "../../resource/button_blue_click.png";
import orangeBase from "../../resource/button_orange_base.png";
import orangeRoll from "../../resource/button_orange_roll.png";
import orangeClick from "../../resource/button_orange_click.png";
import pinkBase from "../../resource/button_pink_base.png";
import pinkRoll from "../../resource/button_pink_roll.png";
import pinkClick from "../../resource/button_pink_click.png";
import playBase from "../../resource/button_play_base.png";
import playRoll from "../../resource/button_play_roll.png";
import playClick from "../../resource/button_play_click.png";
import xBase from "../../resource/button_X_base.png";
import xRoll from "../../resource/button_X_roll.png";
import xClick from "../../resource/button_X_click.png";

import boxSmall from "../../site-resource/box_small.png";
import logo from "../../site-resource/logo.png";

// True nine-patch panel frames generated from the original PIXI box### 3-slice
// strips (resource/box248_{top,mid,bot}.png composited into one tile; the cream
// variant is the same bevel recolored to parchment). See scripts/gen-panels or
// the generation note in docs. Slice: `15 12 24 12 fill`.
import panelFrame from "./generated/panel_ninepatch.png";
import panelFrameCream from "./generated/panel_ninepatch_cream.png";

export const buttonTextures = {
	purple: { base: purpleBase, roll: purpleRoll, click: purpleClick },
	red: { base: redBase, roll: redRoll, click: redClick },
	blue: { base: blueBase, roll: blueRoll, click: blueClick },
	orange: { base: orangeBase, roll: orangeRoll, click: orangeClick },
	pink: { base: pinkBase, roll: pinkRoll, click: pinkClick },
	play: { base: playBase, roll: playRoll, click: playClick },
	x: { base: xBase, roll: xRoll, click: xClick },
} as const;

export type ButtonFamily = keyof typeof buttonTextures;

export const frameTextures = {
	boxSmall,
	logo,
	/** Beveled periwinkle window frame (nine-patch, slice 15 12 24 12 fill). */
	panelFrame,
	/** Same bevel recolored to cream parchment with a purple edge. */
	panelFrameCream,
};

/**
 * Build the CSS custom properties an `.ib-btn` needs for a given color family,
 * so hover/active can swap `border-image-source` purely in CSS.
 */
export function ibBtnVars(family: ButtonFamily): Record<string, string> {
	const t = buttonTextures[family];
	return {
		"--ib-btn-base": `url(${t.base})`,
		"--ib-btn-roll": `url(${t.roll})`,
		"--ib-btn-click": `url(${t.click})`,
	};
}

/**
 * Every button/panel texture URL, across ALL states (base + rollover + click for
 * each button family, plus the nine-patch window frames). The rollover/click
 * textures are only referenced by CSS on :hover / :active, so the browser would
 * otherwise fetch them on FIRST interaction — a visible flash as the glossy
 * state pops in. preloadUiAssets() warms the HTTP/image cache up front so every
 * state is instant. Same-URL border-image reuses the cached decode.
 */
const allTextureUrls: readonly string[] = [
	...Object.values(buttonTextures).flatMap((t) => [t.base, t.roll, t.click]),
	...Object.values(frameTextures),
];

let preloaded = false;

/** Warm the image cache for every button/panel texture (idempotent, browser-only). */
export function preloadUiAssets(): void {
	if (preloaded || typeof Image === "undefined") return;
	preloaded = true;
	for (const url of allTextureUrls) {
		const img = new Image();
		img.src = url;
	}
}
