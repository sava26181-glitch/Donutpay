-- v39: убираем лишние «игры»
update games set is_active=false where slug in ('chicken-gun','vkontakte') or name ilike '%аниме%' or name ilike '%anime%';
