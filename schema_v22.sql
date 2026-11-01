-- v22: подтверждение номера по SMS: хэш номера (уникальный) и последние 4 цифры
alter table users add column if not exists phone_hash text;
alter table users add column if not exists phone_last4 text;
create unique index if not exists u_phone_hash on users(phone_hash) where phone_hash is not null;
