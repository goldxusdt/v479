create table if not exists public.admin_audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id),
  action text not null,
  target_table text,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.admin_audit_logs enable row level security;

-- Policy for admins
create policy "Admins can view all audit logs"
  on public.admin_audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role::text = 'admin'
    )
  );

create policy "Admins can insert audit logs"
  on public.admin_audit_logs
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role::text = 'admin'
    )
  );
