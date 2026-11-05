-- v66: уведомления о сообщениях в Telegram (бот donutvolume)
alter table users add column if not exists tg_notify_id bigint;
alter table users add column if not exists tg_notify_on boolean not null default false;
create table if not exists notify_links(token_hash text primary key, user_id uuid not null references users on delete cascade, expires_at timestamptz not null);
