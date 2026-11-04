-- v26: роль «Организатор», призовые места, игровой ID участника, произвольное число мест
alter table tournaments add column if not exists prizes jsonb not null default '[]'::jsonb;
alter table tournament_players add column if not exists game_id text;
