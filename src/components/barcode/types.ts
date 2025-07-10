
import { ScanResponse } from '@/types/auth';

export interface BarcodeScannerProps {
  onScanComplete?: (data: ScanResponse['data']) => void;
  embedded?: boolean;
  allowManualEntry?: boolean;
  allowCameraScanning?: boolean;
  onBarcodeScanned?: (barcode: string) => void | Promise<void>;
  inputValue?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scanButtonLabel?: string;
}

export interface BarcodeProcessorOptions {
  user: { id?: string; role?: string } | null;
  toast: any;
  onScanComplete?: (data: ScanResponse['data']) => void;
  onBarcodeScanned?: (barcode: string) => void | Promise<void>;
}
