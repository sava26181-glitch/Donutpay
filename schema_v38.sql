-- v74: переписка по заявке на вывод: пользователь и администрация пишут друг другу
create table if not exists withdrawal_msgs (
  id bigserial primary key,
  withdrawal_id uuid not null references withdrawals(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists i_wdm on withdrawal_msgs(withdrawal_id, id);
