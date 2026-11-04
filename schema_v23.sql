-- v23: коды подтверждения номера, которые сайт отправляет через SMS-сервис (хранится только хэш кода)
create table if not exists phone_codes(user_id uuid primary key references users on delete cascade,phone_hash text not null,code_hash text not null,attempts int not null default 0,expires_at timestamptz not null,created_at timestamptz not null default now());
