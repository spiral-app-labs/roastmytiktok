alter table rmt_roast_sessions
  add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_rmt_roast_sessions_user_id
  on rmt_roast_sessions(user_id);
