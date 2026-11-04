-- v8: финансы (тестовый баланс, вывод), расположение элементов профиля хранится в users.theme
create table if not exists withdrawals(id uuid primary key default gen_random_uuid(),user_id uuid not null references users on delete cascade,amount numeric(14,2) not null check(amount>0),method text not null,details text not null,status text not null default 'pending' check(status in('pending','paid','rejected')),note text,created_at timestamptz not null default now(),resolved_at timestamptz,resolved_by uuid references users);
create index if not exists i_wd on withdrawals(status,created_at);
