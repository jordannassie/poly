create table if not exists public.job_locks (
  key text primary key,
  locked_until timestamptz not null,
  owner text,
  updated_at timestamptz not null default now()
);

create index if not exists job_locks_locked_until_idx
  on public.job_locks (locked_until);

alter table public.job_locks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='job_locks'
      and policyname='service role can manage locks'
  ) then
    create policy "service role can manage locks"
    on public.job_locks
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;
