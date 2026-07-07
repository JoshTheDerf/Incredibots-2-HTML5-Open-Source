// Type declarations for the vendored `lzma` package worker (lzma_worker.js).
// The implementation is plain JS; these declarations only describe the API
// surface ByteArray.ts uses (`LZMA.compress` / `LZMA.decompress`, awaited).
export declare const LZMA: {
  compress(
    data: any,
    mode?: number,
    on_finish?: (result: any, error: any) => void,
    on_progress?: (percent: number) => void,
  ): any;
  decompress(
    data: any,
    on_finish?: (result: any, error: any) => void,
    on_progress?: (percent: number) => void,
  ): any;
};
export declare const LZMA_WORKER: typeof LZMA;
