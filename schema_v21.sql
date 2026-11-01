-- v21: турниры (бесплатные): турнир, участники, матчи сетки, результаты от игроков
create table if not exists tournaments(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game_name text not null,
  format text not null default 'single' check (format in ('single','double')),
  max_players int not null check (max_players between 4 and 64),
  prize_text text,
  rules_text text,
  status text not null default 'registration' check (status in ('registration','running','finished','cancelled')),
  start_at timestamptz not null,
  created_by uuid references users on delete set null,
  winner_user_id uuid references users on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists i_tr_status on tournaments(status,start_at);
create table if not exists tournament_players(
  tournament_id uuid not null references tournaments on delete cascade,
  user_id uuid not null references users on delete cascade,
  nick text not null,
  seed int,
  created_at timestamptz not null default now(),
  primary key(tournament_id,user_id)
);
create index if not exists i_tp_user on tournament_players(user_id);
create table if not exists tournament_matches(
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments on delete cascade,
  code text not null,
  bracket text not null check (bracket in ('W','L','GF')),
  round int not null,
  slot int not null,
  p1 text, p2 text, winner text, loser text,
  winner_to text, winner_side text, loser_to text, loser_side text,
  score1 int, score2 int,
  status text not null default 'pending' check (status in ('pending','ready','waiting_result','disputed','done')),
  unique(tournament_id,code)
);
create index if not exists i_tm_t on tournament_matches(tournament_id,bracket,round,slot);
create table if not exists tournament_reports(
  match_id uuid not null references tournament_matches on delete cascade,
  user_id uuid not null references users on delete cascade,
  s_me int not null,
  s_opp int not null,
  created_at timestamptz not null default now(),
  primary key(match_id,user_id)
);
