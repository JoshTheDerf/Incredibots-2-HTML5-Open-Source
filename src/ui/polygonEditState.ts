// UI-local shared state for the Polygon bézier point editor (NOT part of the
// headless GameCore). GameCanvas sets which control point of the selected
// Polygon is currently active (clicked); ShapeProps reads it to show that
// point's VERTEX / ASYMMETRIC / SYMMETRIC toggle + add/remove affordances, and
// the canvas draws that point's handles. A module-level reactive singleton so
// the canvas and the property panel share one selection without routing purely
// presentational state through the core.

import { ref } from "vue";

/** Index of the active control point on the selected Polygon, or null if none. */
export const selectedPolyPoint = ref<number | null>(null);
