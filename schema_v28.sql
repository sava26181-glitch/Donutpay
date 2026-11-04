-- v28: турнир можно начать от 2 участников
alter table tournaments drop constraint if exists tournaments_max_players_check;
alter table tournaments add constraint tournaments_max_players_check check (max_players between 2 and 128);
