import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MainLayout } from '@/layouts/MainLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { toast } from 'sonner';

// Public pages
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import Unauthorized from './pages/Unauthorized';
import AuthCallback from './pages/auth/callback';
import ResetPassword from './pages/auth/reset-password';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ProductManagement from './pages/admin/ProductManagement';
import WarehouseManagement from './pages/admin/WarehouseManagement';
import UsersManagement from './pages/admin/UsersManagement';
import CustomerInquiries from './pages/admin/CustomerInquiries';
import AdminInventoryView from './pages/admin/InventoryView';
import BatchInventoryPage from './pages/admin/BatchInventoryPage';
import BarcodeManagement from './pages/admin/BarcodeManagement';
import AdminBarcodeLookup from './pages/admin/BarcodeLookup';
import StockInManagement from './pages/admin/StockInManagement';
import StockOutManagement from './pages/admin/StockOutManagement';
import InventoryTransfers from './pages/admin/InventoryTransfers';
import BarcodeInventoryPage from './pages/admin/BarcodeInventoryPage';
import BatchStockInPage from './pages/admin/BatchStockInPage';
import AdminEnhancedInventoryView from './pages/admin/EnhancedInventoryView';
import ProductInventoryView from './pages/admin/ProductInventoryView';
import BatchDetailsPage from './pages/admin/BatchDetailsPage';

// Manager pages
import ManagerDashboard from './pages/warehouseManager/ManagerDashboard';
import StockInProcessing from './pages/warehouseManager/StockInProcessing';
import StockInDetailsPage from './pages/warehouseManager/StockInDetailsPage';
import ProcessStockInPage from './pages/warehouseManager/ProcessStockInPage';
import StockOutApproval from './pages/warehouseManager/StockOutApproval';
import BarcodeScannerPage from './pages/BarcodeScannerPage';
import BarcodeStockOutPage from './pages/warehouseManager/BarcodeStockOutPage';
import BarcodeLookup from './pages/warehouseManager/BarcodeLookup';
import { InventoryTransfers as ManagerInventoryTransfers } from './pages/warehouseManager/InventoryTransfers';
import ManagerBatchStockInPage from './pages/warehouseManager/BatchStockInPage';
import BatchOverviewPage from './pages/warehouseManager/BatchOverviewPage';
import StockOutHistoryPage from './pages/StockOutHistoryPage';
import BarcodeAssignmentPage from './pages/warehouseManager/BarcodeAssignmentPage';
import EnhancedInventoryView from './pages/warehouseManager/EnhancedInventoryView';
import ManagerInventoryView from './pages/warehouseManager/InventoryView';

// Field operator pages
import OperatorDashboard from './pages/fieldOperator/OperatorDashboard';
import StockInForm from './pages/fieldOperator/StockInForm';
import Submissions from './pages/fieldOperator/Submissions';
import FieldOperatorBarcodeLookup from './pages/fieldOperator/BarcodeLookup';
import Transfers from './pages/fieldOperator/Transfers';
import Settings from './pages/fieldOperator/Settings';

// Sales operator pages
import SalesOperatorDashboard from './pages/salesOperator/SalesOperatorDashboard';
import CustomerInquiriesManagement from './pages/salesOperator/CustomerInquiriesManagement';
import SalesInventoryView from './pages/salesOperator/InventoryView';
import ProductView from './pages/salesOperator/ProductView';
import OrdersManagement from './pages/salesOperator/OrdersManagement';
import CustomersPage from './pages/salesOperator/CustomersPage';

// Public pages
import ProductCatalogue from './pages/public/ProductCatalogue';
import ProductDetail from './pages/public/ProductDetail';
import Cart from './pages/public/Cart';

// Import the new UnifiedBatchProcessingPage components
import UnifiedBatchProcessingPage from '@/pages/warehouseManager/UnifiedBatchProcessingPage';
import AdminUnifiedBatchProcessingPage from '@/pages/admin/UnifiedBatchProcessingPage';
import BatchBarcodesPage from '@/pages/warehouseManager/BatchBarcodesPage';

function App() {
  React.useEffect(() => {
    // Show a demo toast on first load to confirm sonner is working in production/PWA
    // toast.success('PWA & Sonner toast are working!');
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              
              {/* Product Catalog */}
              <Route path="/products" element={<ProductCatalogue />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
            </Route>
            
            {/* Admin Routes */}
            <Route element={
              <RequireAuth allowedRoles={['admin']}>
                <MainLayout />
              </RequireAuth>
            }>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<ProductManagement />} />
              <Route path="/admin/warehouses" element={<WarehouseManagement />} />
              <Route path="/admin/users" element={<UsersManagement />} />
              <Route path="/admin/sales-inquiries" element={<CustomerInquiries />} />
              <Route path="/admin/inventory" element={<AdminEnhancedInventoryView />} />
              <Route path="/admin/inventory/products" element={<ProductInventoryView />} />
              <Route path="/admin/inventory/batch/:batchId" element={<BatchDetailsPage />} />
              <Route path="/admin/inventory/barcode/:barcodeId" element={<BarcodeInventoryPage />} />
              <Route path="/admin/barcodes" element={<BarcodeManagement />} />
              <Route path="/admin/barcode" element={<AdminBarcodeLookup />} />
              <Route path="/admin/stock-in" element={<StockInManagement />} />
              <Route path="/admin/stock-out" element={<StockOutApproval isAdminView={true} />} />
              <Route path="/admin/stock-out-history" element={<StockOutHistoryPage />} />

              <Route path="/admin/stock-out/barcode-scanner" element={<BarcodeScannerPage isAdminView={true} />} />
              <Route path="/admin/stock-out/barcode-scanner/:stockOutId" element={<BarcodeScannerPage isAdminView={true} />} />
              <Route path="/admin/stock-out/barcode-stock-out" element={<BarcodeStockOutPage isAdminView={true} />} />
              <Route path="/admin/transfers" element={<InventoryTransfers />} />
              
              {/* Admin Batch Stock In Routes */}
              <Route path="/admin/stock-in/batch/:stockInId" element={<BatchStockInPage />} />
              <Route path="/admin/stock-in/:stockInId/barcode-assignment" element={<BarcodeAssignmentPage />} />
              <Route path="/admin/stock-in/batches/:stockInId" element={<BatchOverviewPage />} />
              <Route path="/admin/stock-in/:stockInId/unified" element={<AdminUnifiedBatchProcessingPage />} />
            </Route>
            
            {/* Warehouse Manager Routes */}
            <Route element={
              <RequireAuth allowedRoles={['warehouse_manager', 'admin']}>
                <MainLayout />
              </RequireAuth>
            }>
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/manager/stock-in" element={<StockInProcessing />} />
              <Route path="/manager/stock-in/:id" element={<StockInDetailsPage />} />
              <Route path="/manager/stock-in/process/:id" element={<ProcessStockInPage />} />
              <Route path="/manager/stock-out" element={<StockOutApproval isAdminView={false} />} />
              <Route path="/manager/stock-out-history" element={<StockOutHistoryPage />} />
              <Route path="/manager/stock-out/barcode-scanner" element={<BarcodeScannerPage isAdminView={false} />} />
              <Route path="/manager/stock-out/barcode-scanner/:stockOutId" element={<BarcodeScannerPage isAdminView={false} />} />
              <Route path="/manager/stock-out/barcode-stock-out" element={<BarcodeStockOutPage isAdminView={false} />} />
              <Route path="/manager/barcode-stockout/:stockOutId" element={<BarcodeStockOutPage isAdminView={false} />} />
              <Route path="/manager/barcode" element={<BarcodeLookup />} />
              <Route path="/manager/inventory" element={<EnhancedInventoryView />} />
              <Route path="/manager/inventory/search" element={<ManagerInventoryView />} />
              <Route path="/manager/transfers" element={<ManagerInventoryTransfers />} />
              <Route path="/manager/stock-in/batch/:stockInId" element={<ManagerBatchStockInPage />} />
              <Route path="/manager/stock-in/:stockInId/barcode-assignment" element={<BarcodeAssignmentPage />} />
              <Route path="/manager/stock-in/batches/:stockInId" element={<BatchOverviewPage />} />
              <Route path="/manager/stock-in/:stockInId/unified" element={<UnifiedBatchProcessingPage />} />
            </Route>
            
            {/* Shared Protected Routes */}
            <Route element={
              <RequireAuth allowedRoles={['admin', 'warehouse_manager', 'field_operator', 'sales_operator']}>
                <MainLayout />
              </RequireAuth>
            }>
              <Route path="/inventory/batches/:batchId/barcodes" element={<BatchBarcodesPage />} />
              <Route path="/inventory/batches/barcodes" element={<BatchBarcodesPage />} />
              {/* Barcode scanner routes accessible by admin and warehouse manager */}
              <Route path="/barcode-scanner" element={<BarcodeScannerPage />} />
              <Route path="/barcode-scanner/:stockOutId" element={<BarcodeScannerPage />} />
              {/* Redirect route for backward compatibility */}
              <Route path="/warehouse/stock-out" element={<StockOutApproval isAdminView={true} />} />
            </Route>
            
            {/* Field Operator Routes */}
            <Route element={
              <RequireAuth allowedRoles={['field_operator']}>
                <MainLayout />
              </RequireAuth>
            }>
              <Route path="/operator" element={<OperatorDashboard />} />
              <Route path="/operator/stock-in" element={<StockInForm />} />
              <Route path="/operator/submissions" element={<Submissions />} />
              <Route path="/operator/barcode" element={<FieldOperatorBarcodeLookup />} />
              <Route path="/operator/transfers" element={<Transfers />} />
              <Route path="/operator/settings" element={<Settings />} />
            </Route>
            
            {/* Protected Sales Operator Routes */}
            <Route element={
              <RequireAuth allowedRoles={['sales_operator']}>
                <MainLayout />
              </RequireAuth>
            }>
              <Route path="/sales" element={<SalesOperatorDashboard />} />
              <Route path="/sales/products" element={<ProductView />} />
              <Route path="/sales/inventory" element={<SalesInventoryView />} />
              <Route path="/sales/inquiries" element={<CustomerInquiriesManagement />} />
              <Route path="/sales/orders" element={<OrdersManagement />} />
              <Route path="/sales/customers" element={<CustomersPage />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;