-- v72: валюта отображения сумм у пользователя (расчёты всегда идут в рублях)
alter table users add column if not exists currency text not null default 'RUB';
