-- v70: версия сессии: при смене пароля и «выйти на других устройствах» старые куки перестают работать
alter table users add column if not exists token_ver int not null default 0;
