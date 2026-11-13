-- v73: видео проверки личности можно хранить прямо в базе, если облачное хранилище (SB_KEY) не подключено
create table if not exists kyc_videos (
  request_id uuid primary key references kyc_requests(id) on delete cascade,
  data bytea not null,
  mime text not null,
  size int not null,
  created_at timestamptz not null default now()
);
