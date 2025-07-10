# Project Module File Usage

This document tracks which files are used for each major module in the project.  
Update the lists as you build, refactor, or clean up each module.

---

## Stockout

### Used Files
- src/components/warehouse/stockout/BarcodeScanner.tsx
- src/components/warehouse/stockout/BatchItemDetails.tsx
- src/components/warehouse/stockout/StockOutForm.tsx
- src/components/warehouse/stockout/StockOutProgress.tsx
- src/components/warehouse/stockout/StockOutRequestModal.tsx
- src/services/stockout/stockoutService.ts
- src/services/stockout/types.ts
- src/services/stockout/stockoutFix.ts
- src/components/admin/stockout/ProcessStockOutForm.tsx
- src/components/admin/stockout/StockOutForm.tsx
- src/components/admin/stockout/CreateStockOutForm.tsx

### Unused/To Review
- src/components/warehouse/stockout/__tests__/  # (test directory, review if you want to keep tests)

---

## Stockin

### Used Files
- src/components/warehouse/StockInRequestsTable.tsx
- src/components/warehouse/StockInStepFinalize.tsx
- src/components/warehouse/StockInStepPreview.tsx
- src/components/warehouse/StockInStepReview.tsx
- src/components/warehouse/StockInWizard.tsx
- src/components/warehouse/StockInWizardStep.tsx
- src/components/warehouse/StockInStepBatches.tsx
- src/components/warehouse/StockInStepBoxes.tsx
- src/components/warehouse/StockInStepDetails.tsx
- src/components/warehouse/StockInRequestDetails.tsx
- src/components/warehouse/StockInDetails.tsx
- src/components/warehouse/StockInDetailView.tsx
- src/components/warehouse/StockInFilters.tsx
- src/components/warehouse/StockInProcessingStatus.tsx
- src/components/warehouse/RejectStockInDialog.tsx
- src/components/warehouse/StockInApprovalForm.tsx
- src/components/warehouse/StockInDetailItem.tsx
- src/components/warehouse/BatchStockInComponent.tsx
- src/components/warehouse/BatchStockInLoading.tsx
- src/pages/warehouseManager/ProcessStockInPage.tsx
- src/pages/warehouseManager/StockInDetailsPage.tsx
- src/pages/warehouseManager/StockInProcessing.tsx
- src/pages/warehouseManager/BatchStockInPage.tsx

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Barcode Lookup

### Used Files
- src/components/barcode/BarcodeDebugComponent.tsx
- src/components/barcode/BarcodeDetector.d.ts
- src/components/barcode/BarcodeDisplay.tsx
- src/components/barcode/BarcodeFormField.tsx
- src/components/barcode/BarcodeGenerator.tsx
- src/components/barcode/BarcodeInventoryTable.tsx
- src/components/barcode/BarcodeLookup.tsx
- src/components/barcode/BarcodePreview.tsx
- src/components/barcode/BarcodePrinter.tsx
- src/components/barcode/CameraScanner.tsx
- src/components/barcode/MobileBarcodeScanner.tsx
- src/components/barcode/ScanDataDisplay.tsx
- src/components/barcode/types.ts
- src/components/barcode/useBarcodeDetection.ts
- src/components/barcode/useBarcodeProcessor.ts
- src/components/barcode/useHardwareScanner.ts
- src/pages/BarcodeScannerPage.tsx
- src/pages/warehouseManager/BarcodeLookup.tsx
- src/pages/warehouseManager/BarcodeScanner.tsx
- src/services/barcodeInventoryLookup.ts
- src/services/barcodeService.ts
- src/services/barcodeValidationService.ts

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)
- src/components/warehouse/barcode-viewer/  # (if not referenced, review for possible cleanup)

---

## Inventory

### Used Files
- src/components/warehouse/InventoryTableContainer.tsx
- src/components/warehouse/InventoryFiltersPanel.tsx
- src/components/warehouse/InventoryPagination.tsx
- src/components/warehouse/InventoryTable.tsx
- src/components/warehouse/LoadingState.tsx
- src/components/warehouse/LocationBasedInventoryView.tsx
- src/components/warehouse/ErrorState.tsx
- src/components/warehouse/ProcessedBatchesTable.tsx
- src/components/warehouse/ProcessedBatchesFilters.tsx
- src/components/warehouse/EnhancedBatchDetailsDialog.tsx
- src/components/warehouse/ProductView.tsx
- src/pages/warehouse/BarcodeInventoryPage.tsx
- src/pages/warehouse/BatchInventoryPage.tsx
- src/services/inventoryMovementLogger.ts

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Inquiry

### Used Files
- src/components/admin/customer-inquiries/InquiryDetails.tsx
- src/components/admin/customer-inquiries/InquiryList.tsx
- src/components/admin/customer-inquiries/SearchFilters.tsx
- src/pages/customer/CustomerInquiry.tsx
- src/pages/customer/CustomerInquirySuccess.tsx

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Orders

### Used Files
- src/components/sales/CreateSalesOrderForm.tsx
- src/components/sales/InquiryManagement.tsx
- src/components/sales/InventoryStatus.tsx
- src/components/sales/InvoiceGenerator.tsx
- src/components/sales/SalesDashboard.tsx
- src/components/sales/SalesOrderActions.tsx
- src/components/sales/SalesOrderDetailsDialog.tsx
- src/components/sales/SalesOrdersFilters.tsx
- src/components/sales/SalesOrdersTable.tsx

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Reserve Stock

### Used Files
- src/components/reserve-stock/ReserveStockForm.tsx
- src/components/reserve-stock/ReserveStockList.tsx
- src/components/reserve-stock/ReserveStockDetail.tsx
- src/components/reserve-stock/ReserveStockDetails.tsx
- src/services/reserveStockService.ts
- src/pages/warehouseManager/ReserveStock.tsx

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Stock Transfer

### Used Files
- src/components/transfers/ScannedItemsList.tsx
- src/components/transfers/TransferDestinationForm.tsx
- src/components/warehouse/TransferForm.tsx
- src/components/warehouse/TransferHistoryTable.tsx
- src/components/warehouse/TransferApprovalList.tsx
- src/pages/warehouseManager/InventoryTransfers.tsx

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

---

## Shared/Utilities (Optional)

### Used Files
- src/utils/apiUtils.ts
- src/utils/hsnCodes.ts
- src/utils/pwaUtils.ts
- src/utils/formatters.ts
- src/utils/exportUtils.ts
- src/utils/barcodeUtils.ts
- src/utils/barcodeService.ts
- src/utils/stockInProcessor.ts
- src/utils/cameraPermissions.ts
- src/utils/userManagementUtils.ts
- src/lib/toast.ts
- src/lib/utils.ts
- src/lib/supabase.ts
- src/lib/date-utils.ts
- src/lib/supabaseClient.ts
- src/lib/supabase/stockout-transactions.ts
- All files in src/types/ (e.g., auth.ts, barcode.ts, batch.ts, common.ts, database.ts, inventory.ts, location.ts, products.ts, reports.ts, shared.ts, stock.ts, userManagement.ts, etc.)

### Unused/To Review
- (Add any files from these directories that are not referenced in your app, or that you know are legacy/unused.)

--- 