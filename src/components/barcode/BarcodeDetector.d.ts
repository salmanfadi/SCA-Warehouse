// Type definitions for the Barcode Detection API
// This is a polyfill for the experimental Barcode Detection API

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface BarcodeDetectorResult {
  boundingBox: DOMRectReadOnly;
  cornerPoints: ReadonlyArray<{ x: number, y: number }>;
  format: string;
  rawValue: string;
}

declare global {
  class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    static getSupportedFormats(): Promise<string[]>;
    detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
  }
}

export {};
