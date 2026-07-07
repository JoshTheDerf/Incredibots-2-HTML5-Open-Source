// Draw-gesture modifier state (Jaybit polls Input.isKeyDown(16/17); we track
// shift/ctrl here). Kept as a plain non-reactive object — the live preview reads
// it every ticker frame (drawFrame), where no DOM event is available, so
// reactivity isn't needed (and would add per-frame overhead). Updated from every
// pointer AND key event. `ctrl` folds in metaKey for macOS. Beware: callers only
// preventDefault where necessary (ctrl+arrows for pan), never on plain ctrl+key,
// so browser shortcuts keep working.

export interface ModifierState {
	shift: boolean;
	ctrl: boolean;
	/** Refresh from the latest pointer/keyboard event. */
	update(e: PointerEvent | KeyboardEvent): void;
	/** Drop both flags (window blur — no keyup will ever arrive). */
	reset(): void;
}

export function createModifierState(): ModifierState {
	return {
		shift: false,
		ctrl: false,
		update(e: PointerEvent | KeyboardEvent): void {
			this.shift = e.shiftKey;
			this.ctrl = e.ctrlKey || e.metaKey;
		},
		reset(): void {
			this.shift = false;
			this.ctrl = false;
		},
	};
}
