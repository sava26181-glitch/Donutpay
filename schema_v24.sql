-- v24: подтверждение продавца через вход по Telegram: хранится только хэш Telegram ID (уникальный)
alter table users add column if not exists tg_hash text;
create unique index if not exists u_tg_hash on users(tg_hash) where tg_hash is not null;
