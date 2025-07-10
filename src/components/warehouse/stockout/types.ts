import { StockOutRequest, BatchItem, DeductedBatch } from '../barcode/BarcodeValidation';

export interface StockOutFormProps {
  onComplete?: () => void;
  userId: string;
  initialBarcode?: string;
  stockOutRequest?: any;
}

export interface StockOutFormState {
  isLoading: boolean;
  isProcessing: boolean;
  isSuccess: boolean;
  currentBatchItem: BatchItem | null;
  stockOutRequest: StockOutRequest | null;
  processedItems: Array<any>;
  quantity: number;
  scannerEnabled: boolean;
  scannedBarcodes: Set<string>;
  deductedBatches: DeductedBatch[];
}
