-- ============================================================
-- 0178 · Kontrola 24. 10. · N2 — dar na zbierku (prípad) ide vždy jej autorovi; cudzí príjemca sa do zbierky nezapočíta
-- ------------------------------------------------------------
-- Doteraz: platba_create prijal p_case_id (zbierka/skutok) a popri ňom ľubovoľný p_prijemca_ucet alebo p_split.
-- Pohyb šiel na cudzí účet, ale do vyzbieraného zbierky sa započítal (pre_zbierku). Zbierka X tak ukázala dar,
-- ktorý odišiel inam. To isté escrow_uvolni (sponzor uvoľní viazané peniaze komukoľvek, počíta sa zbierke).
-- Teraz:
--   1. platba_create (vstup z appky): keď je zadaný prípad, príjemcu určí server = autor prípadu.
--      p_prijemca_ucet alebo p_split spolu s p_case_id = chyba 'prijemca_z_pripadu'. Bez prípadu ostáva priamy dar
--      na účet (do žiadnej zbierky sa nepočíta). Serverové cesty (QR split, reťaz, zbierky stránok) volajú
--      platba_zapis priamo a príjemcov určujú samy — bez zmeny.
--   2. escrow_uvolni: pri escrow s prípadom je príjemca vždy autor prípadu; p_prijemca_ucet platí len bez prípadu.
-- Spúšťa sa po 0177. Idempotentné.
-- ============================================================
begin;

-- ---------- 1 · platba_create: príjemca z prípadu ----------
create or replace function public.platba_create(
  p_idem_kluc text, p_suma numeric, p_mena text, p_kanal text, p_case_id uuid default null,
  p_meno_darcu text default null, p_prijemca_ucet uuid default null, p_prijemca_text text default null,
  p_obe_registrovane boolean default false, p_tip numeric default 0, p_meta jsonb default '{}'::jsonb, p_split jsonb default null)
  returns public.platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_autor uuid;
begin
  if p_case_id is not null then
    if p_prijemca_ucet is not null or (p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0) then
      raise exception 'Dar na zbierku dostane jej autor — príjemcu určuje server.' using errcode = '42501', detail = 'prijemca_z_pripadu';
    end if;
    select autor_ucet_id into v_autor from public.prispevok where id = p_case_id;
    if v_autor is null then
      raise exception 'Platba nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu';
    end if;
  end if;
  return public.platba_zapis(p_idem_kluc, p_suma, p_mena, p_kanal, p_case_id, public.ja_prihlaseny(), p_meno_darcu,
    v_autor, p_prijemca_text, p_obe_registrovane, p_tip, p_meta, case when p_case_id is null then p_split end);
end $$;
revoke all on function public.platba_create(text,numeric,text,text,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) from public, anon;
grant execute on function public.platba_create(text,numeric,text,text,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to authenticated, service_role;

-- ---------- 2 · escrow_uvolni: príjemca = autor prípadu ----------
create or replace function public.escrow_uvolni(p_escrow uuid, p_suma numeric, p_prijemca_ucet uuid default null, p_prijemca_text text default null)
  returns public.v_escrow
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare e public.escrow; v numeric(14,4); v_prijemca uuid; v_out public.v_escrow;
begin
  select * into e from public.escrow where id = p_escrow for update;
  if not found then raise exception 'escrow_neexistuje' using errcode = 'P0002'; end if;
  perform public.escrow_sponzor_som(e.sponzor);
  if e.stav not in ('aktivny','uvolneny') then raise exception 'Escrow je uzavretý.' using errcode = '22023', detail = 'escrow_uzavrety'; end if;
  v := least(round(coalesce(p_suma, 0), 2), public.escrow_zostatok(p_escrow));
  if v <= 0 then raise exception 'Escrow je vyčerpaný.' using errcode = '22023', detail = 'escrow_prazdny'; end if;
  -- 0178: pri escrow s prípadom je príjemca vždy autor prípadu (nie kto chce sponzor)
  if e.case_id is not null then
    v_prijemca := (select autor_ucet_id from public.prispevok where id = e.case_id);
  else
    v_prijemca := p_prijemca_ucet;
  end if;
  if v_prijemca is null then raise exception 'Uvoľnenie nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu'; end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id, pre_zbierku)
    values (public.novy_doklad(), 1, 'dorovnanie', public.ucet_systemu('viazane'), v_prijemca, v, e.mena,
            case when e.mena = 'DEED' then 'deed' else 'sepa' end, e.id, e.case_id, e.case_id is not null);
  update public.escrow set stav = case when public.escrow_zostatok(p_escrow) <= 0 then 'vycerpany' else 'uvolneny' end where id = p_escrow;
  select * into v_out from public.v_escrow where id = p_escrow;
  return v_out;
end $$;

commit;
