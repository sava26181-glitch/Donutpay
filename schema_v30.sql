-- v61: код выдаёт бот, пользователь вводит его на сайте
create table if not exists tg_codes(id bigserial primary key, code_hash text not null, code_plain text not null, telegram_id bigint not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
create index if not exists i_tgc_hash on tg_codes(code_hash);
create index if not exists i_tgc_tg on tg_codes(telegram_id);
