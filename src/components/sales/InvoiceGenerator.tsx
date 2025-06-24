
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';
import { SalesOrder } from '@/hooks/useSalesOrders';
import { format } from 'date-fns';

interface InvoiceGeneratorProps {
  salesOrder: SalesOrder;
  onGenerateInvoice?: (invoiceData: any) => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  salesOrder,
  onGenerateInvoice
}) => {
  const generateInvoiceData = () => {
    const invoiceNumber = `INV-${salesOrder.sales_order_number}-${Date.now()}`;
    
    const invoiceData = {
      invoice_number: invoiceNumber,
      sales_order_id: salesOrder.id,
      sales_order_number: salesOrder.sales_order_number,
      customer_name: salesOrder.customer_name,
      customer_email: salesOrder.customer_email,
      customer_company: salesOrder.customer_company,
      customer_phone: salesOrder.customer_phone,
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      subtotal: salesOrder.total_amount,
      tax_amount: 0, // Calculate based on GST rates
      total_amount: salesOrder.total_amount,
      items: salesOrder.items.map(item => ({
        product_name: item.product?.name || 'Unknown Product',
        product_sku: item.product?.sku,
        hsn_code: item.product?.hsn_code,
        quantity: item.quantity,
        price: 0, // Set to 0 since prices are not collected in sales orders
        gst_rate: item.product?.gst_rate || 0,
        line_total: 0, // Set to 0 since we don't have prices
      })),
    };

    return invoiceData;
  };

  const handleGenerateInvoice = () => {
    const invoiceData = generateInvoiceData();
    
    if (onGenerateInvoice) {
      onGenerateInvoice(invoiceData);
    } else {
      // Default PDF generation
      generatePDFInvoice(invoiceData);
    }
  };

  const generatePDFInvoice = (invoiceData: any) => {
    // Create a simple HTML invoice for download
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceData.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .customer-info { margin-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .totals { text-align: right; }
          .total-row { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoiceData.invoice_number}</h2>
        </div>
        
        <div class="customer-info">
          <h3>Bill To:</h3>
          <p><strong>${invoiceData.customer_name}</strong><br>
          ${invoiceData.customer_company}<br>
          ${invoiceData.customer_email}<br>
          ${invoiceData.customer_phone || ''}</p>
        </div>
        
        <div class="invoice-details">
          <p><strong>Sales Order:</strong> ${invoiceData.sales_order_number}</p>
          <p><strong>Invoice Date:</strong> ${format(new Date(invoiceData.invoice_date), 'MMM dd, yyyy')}</p>
          <p><strong>Due Date:</strong> ${format(new Date(invoiceData.due_date), 'MMM dd, yyyy')}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>HSN Code</th>
              <th>Quantity</th>
              <th>GST Rate</th>
              <th>Requirements</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map((item: any, index: number) => `
              <tr>
                <td>${item.product_name} ${item.product_sku ? '(' + item.product_sku + ')' : ''}</td>
                <td>${item.hsn_code || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>${item.gst_rate || 0}%</td>
                <td>${salesOrder.items[index]?.requirements || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p><strong>Note:</strong> This is a quotation based on customer requirements. Final pricing to be determined.</p>
        </div>
      </body>
      </html>
    `;

    // Create and download the invoice
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quote-${invoiceData.invoice_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Quote Generation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Sales Order:</strong> {salesOrder.sales_order_number}</p>
            <p><strong>Customer:</strong> {salesOrder.customer_name} ({salesOrder.customer_company})</p>
            <p><strong>Items:</strong> {salesOrder.items.length} products requested</p>
          </div>
          
          <Button onClick={handleGenerateInvoice} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generate & Download Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
