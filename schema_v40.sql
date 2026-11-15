-- v40: ещё лишнее
update games set is_active=false where slug in ('odnoklassniki','tinder','mobilnye-igry');
