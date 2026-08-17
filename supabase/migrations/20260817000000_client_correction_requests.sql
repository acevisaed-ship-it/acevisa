-- Receptionist-initiated client information corrections.
-- Workflow: receptionist requests → admin/CEO approves → receptionist applies.

create table if not exists client_correction_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  requested_by uuid not null references counselors(id),
  branch_id uuid not null references branches(id),
  current_values jsonb not null default '{}'::jsonb,
  proposed_changes jsonb not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied', 'cancelled')),
  reviewed_by uuid references counselors(id),
  reviewed_at timestamptz,
  review_note text,
  applied_at timestamptz,
  applied_values jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ccr_status_branch
  on client_correction_requests(status, branch_id, created_at desc);

create index if not exists idx_ccr_client
  on client_correction_requests(client_id, created_at desc);

create index if not exists idx_ccr_requested_by
  on client_correction_requests(requested_by, created_at desc);
