// ---------------------------------------------------------------------------
// Type-only shims for ActionScript 3 / Flash APIs still referenced by the
// AS3 -> TS port.
//
// IMPORTANT: none of these exist at runtime. Every code path that would
// actually construct one of them is intentionally-orphaned dead code left
// over from the Flash cloud features (Database.ts networking, the legacy
// save/rate/login windows, …) — see docs/TYPECHECK-BASELINE.md and the
// project notes on dead cloud code. These declarations exist purely so the
// TypeScript compiler can check the surrounding *live* code; they change no
// runtime behavior.
// ---------------------------------------------------------------------------

// --- flash.utils.Timer -----------------------------------------------------
declare class Timer {
  constructor(delay: number, repeatCount?: number);
  start(): void;
  stop(): void;
  reset(): void;
  addEventListener(type: string, listener: Function): void;
  removeEventListener(type: string, listener: Function): void;
}
declare class TimerEvent {
  static readonly TIMER: string;
  static readonly TIMER_COMPLETE: string;
}

// --- flash.net URL loading --------------------------------------------------
declare class URLLoader {
  data: any;
  dataFormat: string;
  load(request: URLRequest): void;
  addEventListener(type: string, listener: Function): void;
  removeEventListener(type: string, listener: Function): void;
}
declare class URLRequest {
  constructor(url?: string);
  url: string;
  data: any;
  method: string;
  contentType: string;
}
declare const URLRequestMethod: {
  readonly GET: string;
  readonly POST: string;
};
declare const URLLoaderDataFormat: {
  readonly TEXT: string;
  readonly BINARY: string;
  readonly VARIABLES: string;
};

// --- flash.events -----------------------------------------------------------
declare class SecurityErrorEvent {
  static readonly SECURITY_ERROR: string;
}
declare class IOErrorEvent {
  static readonly IO_ERROR: string;
}
// NOTE: AS3's `Event.COMPLETE` cannot be shimmed here — lib.dom declares the
// `Event` global with an inline type literal (not a named interface), so
// declaration merging is impossible. Call sites use `(Event as any).COMPLETE`
// instead (dead cloud code only; the constant is `undefined` at runtime).

// --- flash.media (only where the pixi-sound port didn't reach) --------------
declare class SoundTransform {
  constructor(volume?: number, panning?: number);
  volume: number;
}
declare class SoundChannel {
  stop(): void;
  soundTransform: SoundTransform;
  [key: string]: any;
}

// --- flash.text / flex asset classes (dead display code) --------------------
// Deliberately `any`: these are placeholder types on fields/locals that are
// never populated at runtime.
declare type TextFormat = any;
declare var TextFormat: any;
declare type TextField = any;
declare var TextField: any;
declare type BitmapAsset = any;
declare var BitmapAsset: any;

// AS3's `Class` type (used for style/asset lookups).
declare type Class = new (...args: any[]) => any;

// --- Dead cloud-feature windows ----------------------------------------------
// The .as sources for these were never ported (intentionally-orphaned cloud
// features). The referencing code paths are unreachable.
declare type SaveLoadWindow = any;
declare var SaveLoadWindow: any;
declare type RateWindow = any;
declare var RateWindow: any;
declare type ReportWindow = any;
declare var ReportWindow: any;
declare type LoginWindow = any;
declare var LoginWindow: any;
declare type GoldLoginWindow = any;
declare var GoldLoginWindow: any;
declare type NewUserWindow = any;
declare var NewUserWindow: any;
declare type LinkWindow = any;
declare var LinkWindow: any;
declare type ExportWindow = any;
declare var ExportWindow: any;
declare type ChooseChallengeWindow = any;
declare var ChooseChallengeWindow: any;
