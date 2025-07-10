-- Add reservation_id to stock_out table
alter table stock_out 
add column if not exists reservation_id uuid references reservations(id),
add column if not exists destination text not null default '',
add column if not exists product_id uuid references products(id),
add column if not exists quantity integer not null default 0,
add column if not exists approved_quantity integer,
add column if not exists approved_by uuid references auth.users(id),
add column if not exists approved_at timestamptz,
add column if not exists rejected_by uuid references auth.users(id),
add column if not exists rejected_at timestamptz,
add column if not exists rejection_reason text,
add column if not exists completed_by uuid references auth.users(id),
add column if not exists completed_at timestamptz,
alter column status type text using status::text,
alter column status set default 'pending';

-- Add constraints to ensure valid status values
alter table stock_out
drop constraint if exists stock_out_status_check,
add constraint stock_out_status_check 
  check (status in ('pending', 'approved', 'rejected', 'processing', 'completed'));

-- Add status tracking to stock_out_details
alter table stock_out_details
add column if not exists status text not null default 'pending',
add column if not exists processed_quantity integer,
add column if not exists processed_by uuid references auth.users(id),
add column if not exists processed_at timestamptz,
add column if not exists batch_id uuid references batches(id);

-- Add constraints to ensure valid status values for details
alter table stock_out_details
drop constraint if exists stock_out_details_status_check,
add constraint stock_out_details_status_check 
  check (status in ('pending', 'processing', 'completed'));

-- Add indexes for better query performance
create index if not exists idx_stock_out_status on stock_out(status);
create index if not exists idx_stock_out_reservation_id on stock_out(reservation_id);
create index if not exists idx_stock_out_details_status on stock_out_details(status);

-- Add RLS policies
alter table stock_out enable row level security;
alter table stock_out_details enable row level security;

-- Policies for stock_out table
create policy "Users can view their own stock out requests"
  on stock_out for select
  using (requested_by = auth.uid() or 
         auth.uid() in (
           select id from auth.users 
           where raw_user_meta_data->>'role' in ('admin', 'warehouse_manager')
         ));

create policy "Users can create their own stock out requests"
  on stock_out for insert
  with check (requested_by = auth.uid());

create policy "Only admins and warehouse managers can update stock out status"
  on stock_out for update
  using (auth.uid() in (
    select id from auth.users 
    where raw_user_meta_data->>'role' in ('admin', 'warehouse_manager')
  ));

-- Policies for stock_out_details table
create policy "Users can view stock out details they have access to"
  on stock_out_details for select
  using (exists (
    select 1 from stock_out so 
    where so.id = stock_out_details.stock_out_id
    and (so.requested_by = auth.uid() or 
         auth.uid() in (
           select id from auth.users 
           where raw_user_meta_data->>'role' in ('admin', 'warehouse_manager')
         ))
  ));

create policy "Users can create stock out details for their requests"
  on stock_out_details for insert
  with check (exists (
    select 1 from stock_out so 
    where so.id = stock_out_details.stock_out_id
    and so.requested_by = auth.uid()
  ));

create policy "Only admins and warehouse managers can update stock out details"
  on stock_out_details for update
  using (auth.uid() in (
    select id from auth.users 
    where raw_user_meta_data->>'role' in ('admin', 'warehouse_manager')
  ));

-- Rename initiated_by to created_by in inventory_transfers table
ALTER TABLE inventory_transfers 
  RENAME COLUMN initiated_by TO created_by; 