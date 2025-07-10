-- Create functions for transaction management
create or replace function begin_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Start a new transaction
  if not (select txid_current() > 0) then
    begin;
  end if;
end;
$$;

create or replace function commit_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Commit the current transaction
  commit;
end;
$$;

create or replace function rollback_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Rollback the current transaction
  rollback;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function begin_transaction to authenticated;
grant execute on function commit_transaction to authenticated;
grant execute on function rollback_transaction to authenticated; 