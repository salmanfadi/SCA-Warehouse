
import { jsPDF } from 'jspdf';
import { BatchData } from '@/types/warehouse';

export class PdfGenerator {
  static generateBarcodesPdf(
    batches: BatchData[],
    getBarcodes: (batch: BatchData) => string[],
    getBatchNumber: (batch: BatchData) => string,
    allBatches: boolean = false
  ): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;
    let currentPage = 1;
    let barcodeCount = 0;
    const barcodesPerPage = 15;

    const targetBatches = allBatches && batches.length > 0 ? batches : [batches[0]];

    targetBatches.forEach((targetBatch, batchIndex) => {
      // Add a new page for each batch after the first one
      if (batchIndex > 0) {
        doc.addPage();
        yPos = 20;
        currentPage = 1;
      }

      // Add title
      doc.setFontSize(18);
      doc.text(`${targetBatch.product_name || targetBatch.product?.name || 'Product'} - Batch #${getBatchNumber(targetBatch)}`, margin, yPos);
      yPos += 10;

      // Add batch details
      doc.setFontSize(12);
      yPos += 10;
      doc.text(`Product: ${targetBatch.product_name || targetBatch.product?.name || 'N/A'} (${targetBatch.product_sku || 'N/A'})`, margin, yPos);
      yPos += 7;
      doc.text(`Warehouse: ${targetBatch.warehouse_name || 'N/A'}`, margin, yPos);
      yPos += 7;
      doc.text(`Location: ${targetBatch.location_name || 'N/A'}`, margin, yPos);
      yPos += 15;

      // Add barcodes in a grid
      doc.setFontSize(14);
      doc.text('Barcodes:', margin, yPos);
      yPos += 10;

      const barcodes = getBarcodes(targetBatch);
      barcodes.forEach((barcode, index) => {
        // Add new page if needed
        if (barcodeCount > 0 && barcodeCount % barcodesPerPage === 0) {
          doc.addPage();
          currentPage++;
          yPos = 20;

          // Add header to new page
          doc.setFontSize(12);
          doc.text(`Batch #${getBatchNumber(targetBatch)} - Page ${currentPage}`, margin, yPos);
          yPos += 15;
        }

        // Add barcode
        doc.setFontSize(10);
        doc.text(`• ${barcode}`, margin + 5, yPos);
        yPos += 5;
        barcodeCount++;
      });
    });

    // Save the PDF
    const filename = allBatches && batches.length > 1
      ? `barcodes-batch-${getBatchNumber(batches[0])}-to-${getBatchNumber(batches[batches.length - 1])}.pdf`
      : `barcodes-${getBatchNumber(batches[0])}.pdf`;

    doc.save(filename);
  }
}
