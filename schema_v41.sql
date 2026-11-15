-- v41: удаляем тестовых пользователей нагрузочного теста (lt_*, @loadtest.invalid) вместе с их данными, где это возможно
do $$ declare u record; begin
  for u in select id from users where email like '%@loadtest.invalid' and role='user' loop
    begin delete from users where id=u.id; exception when others then null; end;
  end loop;
end $$;
