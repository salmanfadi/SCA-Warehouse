
# Agile Warehouse Management System Documentation

## System Overview
The Agile Warehouse Management System is a comprehensive solution for managing warehouse operations, inventory tracking, sales inquiries, and barcode scanning functionality. The application is built using React, TypeScript, and integrates with a Supabase backend for data storage and authentication.

## User Roles

The system supports four distinct user roles, each with specific permissions and access levels:

### 1. Administrator (admin)
- Full access to all system functionality
- User management capabilities
- Product and inventory management
- Warehouse configuration
- Access to sales inquiries
- Barcode management
- Reports and analytics

### 2. Warehouse Manager (warehouse_manager)
- Stock in processing and approval
- Stock out approval
- Inventory lookup and management
- Barcode scanning and lookup
- Barcode generation and management

### 3. Field Operator (field_operator)
- Stock out requests
- Stock in submissions
- View their own submissions history
- Barcode scanning and lookup

### 4. Sales Operator (sales_operator)
- View and respond to customer inquiries
- Access to product catalog
- View inventory status
- Sales dashboard with analytics

## Database Schema

The application uses a PostgreSQL database (via Supabase) with the following key tables:

### Authentication and Users
- `auth.users`: Managed by Supabase, stores authentication information
- `profiles`: Extended user information with role definitions

### Products and Inventory
- `products`: Product information including name, description, specifications
- `inventory`: Individual inventory items with location, quantity, barcode information
- `warehouses`: Warehouse locations and information
- `warehouse_locations`: Specific locations within warehouses (zones, floors)

### Stock Management
- `stock_in`: Records of incoming stock
- `stock_in_details`: Detailed information about incoming stock items
- `stock_out`: Records of outgoing stock requests
- `stock_out_details`: Detailed information about outgoing stock items

### Sales and Customer Interactions
- `sales_inquiries`: Customer inquiries about products
- `sales_inquiry_items`: Specific products in customer inquiries
- `pricing_inquiries`: Customer requests for pricing information

### Barcode Tracking
- `barcode_logs`: Logs of barcode scanning activities

## Architecture and Data Flow

### Authentication Flow
1. Users log in via the Login page
2. Authentication is handled by Supabase Auth services
3. User role information is retrieved from the profiles table
4. Users are redirected to their role-specific dashboard

### Stock In Process
1. Field operators submit stock in requests
2. Warehouse managers review and process incoming stock
3. Inventory is updated with new stock
4. Barcodes are generated for new inventory items

### Stock Out Process
1. Field operators submit stock out requests
2. Warehouse managers review and approve outgoing stock
3. Inventory is updated to reflect changes
4. Tracking information is recorded for fulfillment

### Sales Inquiry Handling
1. Customer inquiries come in through external forms
2. Sales operators respond to inquiries
3. Admins can view all inquiries and response metrics

## Frontend Architecture

The application follows a component-based architecture with React:

### Core Components
- `MainLayout`: Primary layout wrapper for authenticated pages
- `Sidebar`: Navigation sidebar with role-based menu items
- `Navbar`: Top navigation with user information and global actions

### Authentication Components
- `Login`: User authentication page
- `RequireAuth`: Route protection based on user roles

### Feature-specific Components
- Barcode scanning and generation components
- Inventory management interfaces
- Stock processing forms and tables
- Sales inquiry management tools

## Responsive Design

The application is fully responsive with the following breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

Key responsive features include:
- Collapsible sidebar that transforms to a mobile-friendly menu
- Responsive table views with horizontal scrolling on small screens
- Flexible card layouts that reflow for different screen sizes
- Touch-friendly controls for mobile users

## API Integration

The application integrates with Supabase for data management and authentication:
- Real-time data subscriptions for inventory updates
- Row-level security policies ensuring data access control
- Authentication API handling user sessions

## Barcode System

The application includes a comprehensive barcode system:
- Barcode generation for inventory items
- Scanning via camera or hardware scanners
- Barcode lookup functionality
- Bulk printing options for labels

## Getting Started

### Administrator Setup
1. Log in using admin credentials
2. Set up warehouses and locations
3. Add products to the system
4. Configure user accounts for team members

### Warehouse Manager Setup
1. Review inventory organization
2. Set up barcode scanning stations
3. Begin processing stock requests

### Field Operator Guide
1. Log in to access field operations
2. Use the stock in/out forms as needed
3. Review submission history as needed

### Sales Operator Guide
1. Access the sales dashboard for metrics
2. Manage customer inquiries through the inquiry management page
3. Review product catalog and inventory status as needed

## Technical Implementation Details

### Frontend Technologies
- React for component rendering
- TypeScript for type safety
- React Router for navigation
- Tailwind CSS for styling
- Shadcn/ui component library
- Lucide React for icons

### Backend Services
- Supabase for authentication and database
- PostgreSQL for data storage
- Row Level Security for data protection

### Integration Points
- Barcode scanning using browser APIs
- PDF generation for barcode printing
- Real-time updates via Supabase subscriptions

## Troubleshooting

### Authentication Issues
- Clear browser localStorage if experiencing login loops
- Verify proper role assignment in the profiles table
- Check browser console for specific errors

### Data Visibility Issues
- Verify Row Level Security policies are correctly configured
- Check user role assignments
- Validate database relationships and integrity

### Performance Optimization
- Pagination is implemented for large data tables
- Lazy loading for images and secondary content
- Optimized database queries with proper indexing

## Future Enhancements

Potential future improvements include:
- Advanced analytics dashboard
- Mobile application for field operations
- Integration with shipping providers
- Customer portal for self-service
- AI-powered inventory forecasting
