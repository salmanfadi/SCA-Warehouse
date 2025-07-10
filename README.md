# Agile Warehouse UI

A modern warehouse management system built with React, TypeScript, and Supabase.

## Recent Changes (2024-03-21)

### Authentication and User Management
- Fixed logout functionality in the Header component
  - Updated auth hook import from `@/context/AuthContext` to `@/hooks/useAuth`
  - Improved logout process to properly clear auth state
  - Added immediate navigation to login screen after logout
  - Added cleanup of auth-related local storage tokens

### Customer Management
- Fixed the Customers tab in the Sales Operator page
  - Updated database schema integration
  - Fixed profile data display
  - Added proper role filtering for non-staff users
  - Improved error handling and loading states

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── Header.tsx       # Main navigation and auth controls
│   └── ui/                  # Reusable UI components
├── context/
│   └── AuthContext.tsx      # Authentication context
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   └── use-toast.ts        # Toast notifications
├── lib/
│   └── supabase.ts         # Supabase client configuration
├── pages/
│   ├── admin/              # Admin-specific pages
│   └── salesOperator/      # Sales operator pages
└── types/                  # TypeScript type definitions
```

## Features

- 🔐 Authentication with Supabase
- 👥 Role-based access control
- 📊 Customer management
- 🏢 Warehouse management
- 📦 Inventory tracking
- 🛍️ Sales operations
- 🌙 Dark mode support

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Setup

The project requires the following environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Authentication

The application uses Supabase Authentication with the following features:
- Email/Password authentication
- Role-based access control
- Secure session management
- Automatic token refresh
- Profile management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
- TailwindCSS
- Shadcn UI
- React Query
- React Router

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

---
## 📂 Project structure
```
├─ src/
│  ├─ components/            # Re-usable UI & feature components
│  ├─ hooks/                 # React-Query data hooks
│  ├─ layouts/               # Route layouts
│  ├─ pages/                 # Route-level pages
│  ├─ integrations/supabase/ # Supabase client & generated types
│  ├─ utils/                 # Helpers (barcodeUtils, formatters…)
│  └─ ...
├─ supabase/
│  └─ functions/             # Edge functions (Deno)
│     └─ stock_in_process.ts # Atomic stock-in transaction
├─ migrations/               # SQL migrations
└─ README.md
```

---
## 🗄️ Database Schema & Supabase Migration

Below is the full schema for the Agile Warehouse system, including all major tables and a ready-to-use Supabase migration SQL. Use this to quickly set up your database structure in a new Supabase project.

### **Core Tables**
- `profiles` (user info, roles)
- `warehouses` (warehouse locations)
- `warehouse_locations` (zones, shelves, etc.)
- `products` (product catalog)
- `inventory` (box-level inventory)
- `stock_in` (stock-in requests)
- `stock_in_details` (box-level stock-in details)
- `stock_out` (stock-out requests)
- `stock_out_details` (box-level stock-out details)
- `processed_batches` (header for batch processing)
- `batch_items` (box-level rows per batch)
- `sales_inquiries` (customer inquiries)
- `sales_inquiry_items` (products in inquiries)
- `barcode_logs` (barcode scan logs)
- `pricing_inquiries` (customer price requests)
- `stock_movement_audit` (audit log for inventory changes)
- `batch_operations` (batch process audit)
- `batch_inventory_items` (link batch to inventory)

### 🏗️ Example Supabase Migration SQL

```sql
-- 1. User Profiles (extends Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('admin', 'warehouse_manager', 'field_operator', 'sales_operator')),
  created_at timestamp with time zone default now()
);

-- 2. Warehouses
create table warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamp with time zone default now()
);

-- 3. Warehouse Locations (zones, shelves, etc.)
create table warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid references warehouses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- 4. Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sku text unique,
  created_at timestamp with time zone default now()
);

-- 5. Inventory (box-level)
create table inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  warehouse_id uuid references warehouses(id),
  location_id uuid references warehouse_locations(id),
  barcode text unique,
  quantity integer not null,
  status text default 'available',
  created_at timestamp with time zone default now()
);

-- 6. Stock In (header)
create table stock_in (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references profiles(id),
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 7. Stock In Details (box-level)
create table stock_in_details (
  id uuid primary key default gen_random_uuid(),
  stock_in_id uuid references stock_in(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  barcode text,
  created_at timestamp with time zone default now()
);

-- 8. Stock Out (header)
create table stock_out (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references profiles(id),
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 9. Stock Out Details (box-level)
create table stock_out_details (
  id uuid primary key default gen_random_uuid(),
  stock_out_id uuid references stock_out(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  barcode text,
  created_at timestamp with time zone default now()
);

-- 10. Processed Batches (header)
create table processed_batches (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid references warehouses(id),
  product_id uuid references products(id),
  processed_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- 11. Batch Items (box-level per batch)
create table batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references processed_batches(id) on delete cascade,
  inventory_id uuid references inventory(id),
  quantity integer not null,
  created_at timestamp with time zone default now()
);

-- 12. Sales Inquiries
create table sales_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_email text,
  status text default 'open',
  created_at timestamp with time zone default now()
);

-- 13. Sales Inquiry Items
create table sales_inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references sales_inquiries(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null
);

-- 14. Barcode Logs
create table barcode_logs (
  id uuid primary key default gen_random_uuid(),
  scanned_by uuid references profiles(id),
  barcode text,
  action text,
  created_at timestamp with time zone default now()
);

-- 15. Pricing Inquiries
create table pricing_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_email text,
  product_id uuid references products(id),
  requested_price numeric,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 16. Stock Movement Audit
create table stock_movement_audit (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id),
  action text,
  quantity integer,
  performed_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- 17. Batch Operations (audit)
create table batch_operations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references processed_batches(id),
  operation text,
  performed_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- 18. Batch Inventory Items (link batch to inventory)
create table batch_inventory_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references processed_batches(id),
  inventory_id uuid references inventory(id),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) for all tables
alter table profiles enable row level security;
alter table warehouses enable row level security;
alter table warehouse_locations enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table stock_in enable row level security;
alter table stock_in_details enable row level security;
alter table stock_out enable row level security;
alter table stock_out_details enable row level security;
alter table processed_batches enable row level security;
alter table batch_items enable row level security;
alter table sales_inquiries enable row level security;
alter table sales_inquiry_items enable row level security;
alter table barcode_logs enable row level security;
alter table pricing_inquiries enable row level security;
alter table stock_movement_audit enable row level security;
alter table batch_operations enable row level security;
alter table batch_inventory_items enable row level security;

-- Add RLS policies as needed for your roles and access patterns.
```

---
## 🛠️ Setup
1. **Clone & install**
   ```bash
   git clone https://github.com/your-org/agile-warehouse-ui
   cd agile-warehouse-ui
   npm i
   ```
2. **Environment variables** – copy & fill `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public anon key>
   ```
3. **Start dev server**
   ```bash
   npm run dev
   ```
4. **Storybook (optional)**
   ```bash
   npm run storybook
   ```

---
## 🔌 Supabase backend
Project ref: `kysvcexqmywyrawakwfs`

### Tables (simplified)
| Table              | Purpose                                   |
|--------------------|-------------------------------------------|
| `stock_in`         | Stock-in requests (submitted by mobile)   |
| `processed_batches`| Header rows per warehouse/location batch  |
| `batch_items`      | Box-level rows per batch                  |
| `stock_in_details` | Legacy/parallel box rows                  |
| `inventory`        | Current inventory (box level)             |

### Edge Function
`supabase/functions/stock_in_process.ts`
* Accepts JSON payload `{ run_id, stock_in_id, user_id, batches[] }`.
* Runs **all inserts in a single transaction** – rollback on failure.
* Idempotent via unique `client_run_id`.

Helper SQL (added via `migrations/add_tx_helpers.sql`)
```sql
create or replace function begin_transaction() returns void …
create or replace function commit_transaction() returns void …
create or replace function rollback_transaction() returns void …
```

---
## 🖥️ Key Features
### 1 · Stock-In Wizard
Multi-step dialog for processing stock-in requests:
1. **Review** – read-only summary.
2. **Batches** – assign boxes → batches; generate barcodes.
3. **Finalize** – preview all barcodes, print & submit.

On submit the UI calls the Edge Function; if the call fails it gracefully falls back to the older client-side loop.

### 2 · Barcode Generator & Scanner
* **/admin/barcodes** – generate, preview, print CODE-128 barcodes.
* **Scanner** uses `quaggaJS` for live camera scanning and `useBarcodeProcessor` for look-ups.

### 3 · Inventory Dashboard
List of boxes with live quantity, warehouse & zone; per-row print icon opens `BarcodePrinter` modal.

---
## 💻 Scripts
| command            | description                 |
|--------------------|-----------------------------|
| `npm run dev`      | Vite development server     |
| `npm run build`    | Production build            |
| `npm run lint`     | ESLint + Prettier           |
| `npm run storybook`| Component playground        |

---
## 🧑‍💻 Coding standards
* **Type safety** – no `any`; generated Supabase types.
* **React-Query** for data fetching (`src/hooks`).
* **shadcn/ui** for consistent design tokens.
* Components ≤ 300 lines; split otherwise.
* Follow the detailed standards in `.vscode/…` & the custom instructions at the top of this README.

---
## 🔒 Auth flow
* Supabase email-link login.
* `AuthProvider` stores session; `RequireAuth` guards private routes.
* Edge Functions verify JWT via `Authorization: Bearer <token>` header.

---
## 🧪 Testing
* **Vitest** for unit tests (`npm t`).
* **React Testing Library** for component tests.
* Critical flows (stock-in, print) covered by Cypress e2e (see `cypress/`).

---
## 🚀 CI / CD
* **GitHub Actions** – lint, test, build on pull-request.
* On `main` push: builds & deploys Vercel preview, triggers Supabase function deploy via `supabase functions deploy`.

---
## 📜 License
MIT © Agile Warehouse

## Environment Variables

The following environment variables are required in your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_DB_URL=your_supabase_db_url_here
```

Make sure to replace these values with your actual Supabase configuration.
