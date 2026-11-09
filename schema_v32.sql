-- v32: холд 72 часа, проверка подозрительных заказов, верификация личности (лицо и паспорт на видео)
alter table holds add column if not exists release_at timestamptz;
alter table holds add column if not exists reason text;
alter table users add column if not exists id_verified_at timestamptz;
alter table orders add column if not exists review_status text;
alter table orders add column if not exists review_reason text;
create table if not exists kyc_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  order_id uuid references orders on delete set null,
  kind text not null check(kind in('order','identity')),
  reason text,
  status text not null default 'need' check(status in('need','submitted','approved','rejected')),
  bucket text, path text, mime text, size int,
  note text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  resolved_by uuid references users on delete set null,
  resolved_at timestamptz
);
create index if not exists i_kyc_st on kyc_requests(status,created_at);
create index if not exists i_kyc_u on kyc_requests(user_id,created_at);
