-- v71: общие флаги сайта (красная кнопка «СТОП» хранится здесь, чтобы пережить перезапуск сервера)
create table if not exists site_flags (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
