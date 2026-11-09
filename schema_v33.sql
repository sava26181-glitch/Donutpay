-- v69: правила безопасности (обязательное прочтение), имя по паспорту, пауза продаж, проверка реквизитов при выводе
alter table users add column if not exists safety_ack_ver int not null default 0;
alter table users add column if not exists safety_ack_at timestamptz;
alter table users add column if not exists id_name text;
alter table users add column if not exists sales_paused_at timestamptz;
alter table users add column if not exists sales_pause_reason text;
alter table withdrawals add column if not exists holder text;
alter table withdrawals add column if not exists details_norm text;
alter table withdrawals add column if not exists flags jsonb;
create index if not exists i_wd_norm on withdrawals(details_norm);
create index if not exists i_wd_user_t on withdrawals(user_id,created_at);
create index if not exists i_users_paused on users(sales_paused_at) where sales_paused_at is not null;
