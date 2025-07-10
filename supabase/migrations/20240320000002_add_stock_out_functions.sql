-- Function to approve a stock out request
create or replace function approve_stock_out(
  p_stock_out_id uuid,
  p_approved_quantity integer,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Start transaction
  begin;
    -- Update stock out header
    update stock_out
    set status = 'approved',
        approved_by = p_user_id,
        approved_at = now(),
        approved_quantity = p_approved_quantity,
        updated_by = p_user_id,
        updated_at = now()
    where id = p_stock_out_id;

    -- Update details status
    update stock_out_details
    set status = 'pending',
        updated_by = p_user_id,
        updated_at = now()
    where stock_out_id = p_stock_out_id;
  commit;
end;
$$;

-- Function to reject a stock out request
create or replace function reject_stock_out(
  p_stock_out_id uuid,
  p_reason text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Start transaction
  begin;
    -- Update stock out header
    update stock_out
    set status = 'rejected',
        rejected_by = p_user_id,
        rejected_at = now(),
        reason = p_reason,
        updated_by = p_user_id,
        updated_at = now()
    where id = p_stock_out_id;

    -- Update details status
    update stock_out_details
    set status = 'pending',
        updated_by = p_user_id,
        updated_at = now()
    where stock_out_id = p_stock_out_id;
  commit;
end;
$$;

-- Function to process a stock out detail
create or replace function process_stock_out_detail(
  p_detail_id uuid,
  p_processed_quantity integer,
  p_batch_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_quantity integer;
  v_stock_out_id uuid;
  v_pending_details integer;
begin
  -- Start transaction
  begin;
    -- Get current inventory quantity
    select quantity into v_current_quantity
    from inventory
    where batch_id = p_batch_id
    for update;

    if not found then
      raise exception 'Inventory record not found';
    end if;

    if v_current_quantity < p_processed_quantity then
      raise exception 'Insufficient quantity in inventory';
    end if;

    -- Update inventory quantity
    update inventory
    set quantity = quantity - p_processed_quantity,
        updated_by = p_user_id,
        updated_at = now()
    where batch_id = p_batch_id;

    -- Update stock out detail
    update stock_out_details
    set status = 'processing',
        processed_quantity = p_processed_quantity,
        processed_by = p_user_id,
        processed_at = now(),
        batch_id = p_batch_id,
        updated_by = p_user_id,
        updated_at = now()
    where id = p_detail_id
    returning stock_out_id into v_stock_out_id;

    -- Check if all details are processed
    select count(*) into v_pending_details
    from stock_out_details
    where stock_out_id = v_stock_out_id
    and status = 'pending';

    -- If no pending details remain, mark stock out as completed
    if v_pending_details = 0 then
      update stock_out
      set status = 'completed',
          completed_by = p_user_id,
          completed_at = now(),
          updated_by = p_user_id,
          updated_at = now()
      where id = v_stock_out_id;
    else
      -- Otherwise ensure stock out is marked as processing
      update stock_out
      set status = 'processing',
          updated_by = p_user_id,
          updated_at = now()
      where id = v_stock_out_id
      and status != 'processing';
    end if;
  commit;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function approve_stock_out to authenticated;
grant execute on function reject_stock_out to authenticated;
grant execute on function process_stock_out_detail to authenticated; 