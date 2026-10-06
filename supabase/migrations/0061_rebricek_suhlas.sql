-- ============================================================
-- 0061 · Rebríček darcov rešpektuje voľbu darcu (Martin 6. 10. 2026)
-- ------------------------------------------------------------
-- · platba.zobrazenie = voľba pri dare (1 celé meno · 2 meno + iniciála · 3 prezývka · 4 anonym ·
--   5 meno + mesto); appka ju posiela v meta.zobrazenie, predvolené 4 = anonym. Pri anonymnom dare
--   sa meno do platby nezapíše vôbec (nedostane ho ani rebríček, ani výpis príjemcu, ani podpora).
-- · ucet.v_rebricku = súhlas byť v rebríčkoch (predvolene vypnutý, prepína ho človek v profile).
-- · v_top_darcovia: len darcovia so zapnutým súhlasom a len dary s menom. Anonymné dary v Top nie sú
--   vôbec — ani ako „Anonymný darca". Meno = posledné meno, ktoré darca pri dare zvolil.
-- · Staré platby (pred 0061) sú anonymné — ich meno sa zmaže aj z platby, aj z podpory.
-- ============================================================
begin;

alter table public.platba add column if not exists zobrazenie smallint not null default 4 check (zobrazenie between 1 and 5);
alter table public.ucet add column if not exists v_rebricku boolean not null default false;
grant select (v_rebricku) on public.ucet to anon, authenticated;

-- voľba z meta; anonym = bez mena (BEFORE INSERT, takže aj podpora z AFTER triggra dostane null)
create or replace function public.platba_zobrazenie() returns trigger
  language plpgsql set search_path = public, extensions as $$
begin
  if new.meta ? 'zobrazenie' and (new.meta->>'zobrazenie') ~ '^[1-5]$' then
    new.zobrazenie := (new.meta->>'zobrazenie')::smallint;
  end if;
  if new.zobrazenie = 4 then new.odosielatel_text := null; end if;
  return new;
end $$;
drop trigger if exists platba_zobrazenie on public.platba;
create trigger platba_zobrazenie before insert on public.platba for each row execute function public.platba_zobrazenie();

-- staré platby voľbu nepoznajú → predvolená anonymita (spec: default = anonym); meno sa nezachová nikde
update public.podpora po set darca_nazov = null from public.platba pl where pl.id = po.platba_id and pl.zobrazenie = 4 and po.darca_nazov is not null;
update public.platba set odosielatel_text = null where zobrazenie = 4 and odosielatel_text is not null;

-- človek si súhlas s rebríčkami prepína sám
create or replace function public.nastav_v_rebricku(p_zapnute boolean) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  update public.ucet set v_rebricku = coalesce(p_zapnute, false), aktualizovane = now() where id = public.ja_prihlaseny();
end $$;
revoke all on function public.nastav_v_rebricku(boolean) from public, anon;
grant execute on function public.nastav_v_rebricku(boolean) to authenticated;

create or replace view public.v_top_darcovia as
 WITH d AS (
         SELECT p.ucet_debet AS ucet_id, p.mena, p.suma
           FROM pohyb p
             JOIN platba pl ON pl.id = p.platba_id AND pl.zobrazenie <> 4
             JOIN ucet u ON u.id = p.ucet_debet AND u.typ = ANY (ARRAY['pasivny'::text, 'aktivny'::text]) AND u.v_rebricku
             JOIN ucet k ON k.id = p.ucet_kredit AND k.typ <> 'system'::text
          WHERE p.typ = 'dar'::text AND p.storno_pre IS NULL
        UNION ALL
         SELECT r.ucet_kredit, r.mena, - r.suma
           FROM pohyb r
             JOIN pohyb o ON o.id = r.storno_pre
             JOIN platba pl ON pl.id = o.platba_id AND pl.zobrazenie <> 4
             JOIN ucet u ON u.id = r.ucet_kredit AND u.v_rebricku
             JOIN ucet k ON k.id = o.ucet_kredit AND k.typ <> 'system'::text
          WHERE o.typ = 'dar'::text
        )
 SELECT ucet_id,
    round(COALESCE(sum(suma) FILTER (WHERE mena = 'DEED'::text), 0::numeric), 4) AS deed,
    round(COALESCE(sum(suma) FILTER (WHERE mena = 'EUR'::text), 0::numeric), 2) AS eur,
    ( SELECT pl.odosielatel_text
           FROM platba pl
          WHERE pl.odosielatel = d.ucet_id AND pl.zobrazenie <> 4 AND pl.odosielatel_text IS NOT NULL
          ORDER BY pl.cas DESC
         LIMIT 1) AS meno
   FROM d
  GROUP BY ucet_id;

commit;
