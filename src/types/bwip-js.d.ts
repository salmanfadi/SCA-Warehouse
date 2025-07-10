
declare module 'bwip-js' {
  interface BwipOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
    textsize?: number;
    backgroundcolor?: string;
    paddingwidth?: number;
    paddingheight?: number;
    [key: string]: any;
  }

  function toCanvas(
    canvas: HTMLCanvasElement,
    options: BwipOptions
  ): void;

  function toBuffer(
    options: BwipOptions,
    callback: (err: Error | null, png: Uint8Array) => void
  ): void;

  const bwipjs: {
    toCanvas: typeof toCanvas;
    toBuffer: typeof toBuffer;
  };

  export default bwipjs;
}
