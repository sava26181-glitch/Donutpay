-- v29: турниры: чат, помощники, итоги и призы, медиа, закрепление
alter table tournaments add column if not exists pinned boolean not null default false, add column if not exists result_text text, add column if not exists finished_at timestamptz;
alter table tournament_players add column if not exists place int, add column if not exists prize numeric(10,2) not null default 0;
create table if not exists tournament_messages(id uuid primary key default gen_random_uuid(), tournament_id uuid not null references tournaments on delete cascade, user_id uuid not null references users on delete cascade, body text not null check(char_length(body)<=500), created_at timestamptz not null default now());
create index if not exists i_tmsg on tournament_messages(tournament_id,created_at);
create table if not exists tournament_helpers(tournament_id uuid not null references tournaments on delete cascade, user_id uuid not null references users on delete cascade, primary key(tournament_id,user_id));
create table if not exists tournament_media(id uuid primary key default gen_random_uuid(), tournament_id uuid not null references tournaments on delete cascade, kind text not null check(kind in('result','highlight')), media_id uuid, url text, caption text, created_at timestamptz not null default now());
create index if not exists i_tmed on tournament_media(tournament_id,kind,created_at);
