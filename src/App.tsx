import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MainLayout } from '@/layouts/MainLayout';
import { PublicLayout } from '@/layouts/PublicLayout';

// Public pages
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import Unauthorized from './pages/Unauthorized';

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
import ReserveStock from './pages/admin/ReserveStock';

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
import BarcodeAssignmentPage from './pages/warehouseManager/BarcodeAssignmentPage';
import { default as ManagerReserveStock } from './pages/warehouseManager/ReserveStock';
import EnhancedInventoryView from './pages/warehouseManager/EnhancedInventoryView';
import ManagerInventoryView from './pages/warehouseManager/InventoryView';

// Field operator pages
import OperatorDashboard from './pages/fieldOperator/OperatorDashboard';
import StockInForm from './pages/fieldOperator/StockInForm';
import StockOutForm from './pages/fieldOperator/StockOutForm';
import Submissions from './pages/fieldOperator/Submissions';
import FieldOperatorBarcodeLookup from './pages/fieldOperator/BarcodeLookup';
import Transfers from './pages/fieldOperator/Transfers';
import Settings from './pages/fieldOperator/Settings';
import { default as OperatorReserveStock } from './pages/fieldOperator/ReserveStock';

// Sales operator pages
import SalesOperatorDashboard from './pages/salesOperator/SalesOperatorDashboard';
import CustomerInquiriesManagement from './pages/salesOperator/CustomerInquiriesManagement';
import SalesInventoryView from './pages/salesOperator/InventoryView';
import ProductView from './pages/salesOperator/ProductView';
import OrdersManagement from './pages/salesOperator/OrdersManagement';
import CustomersPage from './pages/salesOperator/CustomersPage';

// Customer pages
import CustomerPortal from './pages/customer/CustomerPortal';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerLanding from './pages/customer/CustomerLanding';
import CustomerProducts from './pages/customer/CustomerProducts';
import CustomerInquiry from './pages/customer/CustomerInquiry';
import CustomerInquirySuccess from './pages/customer/CustomerInquirySuccess';
import ResetPassword from './pages/customer/ResetPassword';

// Public pages
import ProductCatalogue from './pages/public/ProductCatalogue';
import ProductDetail from './pages/public/ProductDetail';
import Cart from './pages/public/Cart';

// Import the new UnifiedBatchProcessingPage components
import UnifiedBatchProcessingPage from '@/pages/warehouseManager/UnifiedBatchProcessingPage';
import AdminUnifiedBatchProcessingPage from '@/pages/admin/UnifiedBatchProcessingPage';
import BatchBarcodesPage from '@/pages/warehouseManager/BatchBarcodesPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Customer Public Routes */}
                <Route path="/customer/login" element={<CustomerLogin />} />
                <Route path="/customer/register" element={<CustomerRegister />} />
                <Route path="/customer/reset-password" element={<ResetPassword />} />
                <Route path="/customer" element={<CustomerLanding />} />
                
                {/* Product Catalog */}
                <Route path="/products" element={<ProductCatalogue />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
              </Route>
              
              {/* Customer Portal */}
              <Route path="/customer/portal" element={
                <RequireAuth allowedRoles={['customer']}>
                  <CustomerPortal />
                </RequireAuth>
              } />
              <Route path="/customer/products" element={
                <RequireAuth allowedRoles={['customer']}>
                  <CustomerProducts />
                </RequireAuth>
              } />
              <Route path="/customer/inquiry" element={
                <RequireAuth allowedRoles={['customer']}>
                  <CustomerInquiry />
                </RequireAuth>
              } />
              <Route path="/customer/inquiry/success" element={
                <RequireAuth allowedRoles={['customer']}>
                  <CustomerInquirySuccess />
                </RequireAuth>
              } />
              
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
                <Route path="/admin/stock-out" element={<StockOutManagement />} />
                <Route path="/admin/transfers" element={<InventoryTransfers />} />
                <Route path="/admin/reserve-stock" element={<ReserveStock />} />
                
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
                <Route path="/manager/stock-out" element={<StockOutApproval />} />
                <Route path="/manager/stock-out/barcode-scanner" element={<BarcodeScannerPage />} />
                <Route path="/barcode-scanner/:stockOutId" element={<BarcodeScannerPage />} />
                <Route path="/manager/stock-out/barcode-stock-out" element={<BarcodeStockOutPage />} />
                <Route path="/manager/barcode" element={<BarcodeLookup />} />
                <Route path="/manager/inventory" element={<EnhancedInventoryView />} />
                <Route path="/manager/inventory/search" element={<ManagerInventoryView />} />
                <Route path="/manager/transfers" element={<ManagerInventoryTransfers />} />
                <Route path="/manager/stock-in/batch/:stockInId" element={<ManagerBatchStockInPage />} />
                <Route path="/manager/stock-in/:stockInId/barcode-assignment" element={<BarcodeAssignmentPage />} />
                <Route path="/manager/stock-in/batches/:stockInId" element={<BatchOverviewPage />} />
                <Route path="/manager/stock-in/:stockInId/unified" element={<UnifiedBatchProcessingPage />} />
                <Route path="/manager/reserve-stock" element={<ManagerReserveStock />} />
              </Route>
              
              {/* Shared Protected Routes */}
              <Route element={
                <RequireAuth allowedRoles={['admin', 'warehouse_manager', 'field_operator', 'sales_operator']}>
                  <MainLayout />
                </RequireAuth>
              }>
                <Route path="/inventory/batches/:batchId/barcodes" element={<BatchBarcodesPage />} />
                <Route path="/inventory/batches/barcodes" element={<BatchBarcodesPage />} />
              </Route>
              
              {/* Field Operator Routes */}
              <Route element={
                <RequireAuth allowedRoles={['field_operator']}>
                  <MainLayout />
                </RequireAuth>
              }>
                <Route path="/operator" element={<OperatorDashboard />} />
                <Route path="/operator/stock-in" element={<StockInForm />} />
                <Route path="/operator/stock-out" element={<StockOutForm />} />
                <Route path="/operator/submissions" element={<Submissions />} />
                <Route path="/operator/barcode" element={<FieldOperatorBarcodeLookup />} />
                <Route path="/operator/transfers" element={<Transfers />} />
                <Route path="/operator/settings" element={<Settings />} />
                <Route path="/operator/reserve-stock" element={<OperatorReserveStock />} />
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
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
