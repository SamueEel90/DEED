-- 0102: typ „ine“ sa do štatistiky editora zapíše, neznámy typ nie
begin;
do $$
begin
  insert into public.editor_vytvorenia (udalost, typ, kto) values ('hotovo', 'ine', 'farar');
  begin
    insert into public.editor_vytvorenia (udalost, typ, kto) values ('hotovo', 'nieco', 'farar');
    raise exception 'neznamy typ presiel';
  exception when check_violation then null;
  end;
  if (select count(*) from public.editor_vytvorenia where typ = 'ine') <> 1 then raise exception 'ine sa nezapisalo'; end if;
end $$;
rollback;
select 'editor_ine_test OK';
