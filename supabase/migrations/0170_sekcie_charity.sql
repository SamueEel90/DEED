-- ============================================================
-- 0170 · Martin 23. 10. · nový číselník sekcií charity (dokument „Sekcie a odvetvia“, stav 14. 9. 2026)
-- ------------------------------------------------------------
-- cis_segmenty (0001/0002) dostane nové sekcie a podskupiny; staré položky sa vypnú (aktivny = false), nič sa nemaže.
-- Charita vyberá podskupiny v registrácii (krok Stanovy, povinné) → public.segmenty (org_ucet_id, sektor, pod_segment).
-- Sektorová zbierka (sektor_stranky, 0169) smie mať oblasť len z podskupín, ktoré charita vybrala.
-- Charita bez vybraných podskupín (registrovaná pred týmto krokom) smie ľubovoľnú aktívnu podskupinu číselníka.
-- Kontrola platí len pre zápisy z appky (authenticated/anon). Idempotentné.
-- ============================================================
begin;

alter table public.cis_segmenty add column if not exists poradie_sektora int not null default 0;
update public.cis_segmenty set aktivny = false;
insert into public.cis_segmenty (sektor, pod_segment, od_balika, poradie, poradie_sektora, aktivny) values
  ('Zdravie a pacienti', 'onkologické pacientske organizácie', 'free', 1, 1, true),
  ('Zdravie a pacienti', 'hospice a paliatívna starostlivosť', 'free', 2, 1, true),
  ('Zdravie a pacienti', 'vzácne a chronické choroby', 'free', 3, 1, true),
  ('Zdravie a pacienti', 'duševné zdravie a krízové linky', 'free', 4, 1, true),
  ('Zdravie a pacienti', 'darcovstvo krvi, kostnej drene a orgánov', 'free', 5, 1, true),
  ('Zdravie a pacienti', 'zdravotnícke prístroje a rehabilitácia', 'free', 6, 1, true),
  ('Zdravie a pacienti', 'prevencia a prvá pomoc', 'free', 7, 1, true),
  ('Deti a mládež', 'detské domovy a náhradná rodinná starostlivosť', 'free', 1, 2, true),
  ('Deti a mládež', 'opustené a ohrozené deti', 'free', 2, 2, true),
  ('Deti a mládež', 'krízové linky pre deti', 'free', 3, 2, true),
  ('Deti a mládež', 'štipendiá a doučovanie pre deti zo slabších rodín', 'free', 4, 2, true),
  ('Deti a mládež', 'tábory, kluby, skauti', 'free', 5, 2, true),
  ('Zvieratá', 'útulky', 'free', 1, 3, true),
  ('Zvieratá', 'záchrana týraných zvierat', 'free', 2, 3, true),
  ('Zvieratá', 'kastračné programy', 'free', 3, 3, true),
  ('Zvieratá', 'záchranné stanice pre voľne žijúce zvieratá', 'free', 4, 3, true),
  ('Zvieratá', 'ochrana práv zvierat', 'free', 5, 3, true),
  ('Príroda a ekológia', 'výsadba a obnova krajiny', 'free', 1, 4, true),
  ('Príroda a ekológia', 'čistenie riek, lesov a brehov', 'free', 2, 4, true),
  ('Príroda a ekológia', 'ochrana biotopov a druhov', 'free', 3, 4, true),
  ('Príroda a ekológia', 'odpady a klíma', 'free', 4, 4, true),
  ('Príroda a ekológia', 'environmentálna osveta', 'free', 5, 4, true),
  ('Nevidiaci a hendikep', 'nevidiaci a slabozrakí', 'free', 1, 5, true),
  ('Nevidiaci a hendikep', 'nepočujúci', 'free', 2, 5, true),
  ('Nevidiaci a hendikep', 'telesné postihnutie', 'free', 3, 5, true),
  ('Nevidiaci a hendikep', 'mentálne a kombinované postihnutie', 'free', 4, 5, true),
  ('Nevidiaci a hendikep', 'autizmus', 'free', 5, 5, true),
  ('Nevidiaci a hendikep', 'chránené dielne', 'free', 6, 5, true),
  ('Nevidiaci a hendikep', 'bezbariérovosť', 'free', 7, 5, true),
  ('Seniori a rodina', 'osamelí seniori', 'free', 1, 6, true),
  ('Seniori a rodina', 'opatrovateľská a domáca starostlivosť', 'free', 2, 6, true),
  ('Seniori a rodina', 'denné stacionáre', 'free', 3, 6, true),
  ('Seniori a rodina', 'rodiny v núdzi', 'free', 4, 6, true),
  ('Seniori a rodina', 'jednorodičia', 'free', 5, 6, true),
  ('Seniori a rodina', 'podpora pestúnov', 'free', 6, 6, true),
  ('Záchrana', 'dobrovoľné hasičské zbory', 'free', 1, 7, true),
  ('Záchrana', 'horská záchranná služba', 'free', 2, 7, true),
  ('Záchrana', 'vodná záchrana', 'free', 3, 7, true),
  ('Záchrana', 'kynologické záchranné brigády', 'free', 4, 7, true),
  ('Záchrana', 'civilná ochrana', 'free', 5, 7, true),
  ('Ľudia v núdzi', 'ľudia bez domova a nocľahárne', 'free', 1, 8, true),
  ('Ľudia v núdzi', 'potravinová pomoc', 'free', 2, 8, true),
  ('Ľudia v núdzi', 'chudoba a zadlženosť', 'free', 3, 8, true),
  ('Ľudia v núdzi', 'závislosti a resocializácia', 'free', 4, 8, true),
  ('Ľudia v núdzi', 'ľudia po výkone trestu', 'free', 5, 8, true),
  ('Ľudia v núdzi', 'obete násilia a krízové centrá', 'free', 6, 8, true),
  ('Ľudia v núdzi', 'menšiny a integrácia', 'free', 7, 8, true),
  ('Humanitárna pomoc', 'prírodné katastrofy', 'free', 1, 9, true),
  ('Humanitárna pomoc', 'vojnové konflikty a utečenci', 'free', 2, 9, true),
  ('Humanitárna pomoc', 'rozvojová pomoc v zahraničí', 'free', 3, 9, true),
  ('Naše okolie', 'obnova ihrísk, parkov a lavičiek', 'free', 1, 10, true),
  ('Naše okolie', 'chodníky a zastávky', 'free', 2, 10, true),
  ('Naše okolie', 'komunitné záhrady', 'free', 3, 10, true),
  ('Naše okolie', 'susedské a skrášľovacie iniciatívy', 'free', 4, 10, true),
  ('Nadácie a fondy', 'nadácie', 'free', 1, 11, true),
  ('Nadácie a fondy', 'firemné nadácie', 'free', 2, 11, true),
  ('Nadácie a fondy', 'mestské fondy', 'free', 3, 11, true),
  ('Advokácia a právna pomoc', 'ľudské práva', 'free', 1, 12, true),
  ('Advokácia a právna pomoc', 'právna pomoc', 'free', 2, 12, true),
  ('Advokácia a právna pomoc', 'transparentnosť a protikorupcia', 'free', 3, 12, true)
on conflict (sektor, pod_segment) do update set aktivny = true, poradie = excluded.poradie, poradie_sektora = excluded.poradie_sektora, od_balika = excluded.od_balika;

-- oblasť sektora: z podskupín charity, inak z aktívneho číselníka
create or replace function public.oblast_sektora_povolena(p_stranka text, p_oblast text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.segmenty g join public.stranka s on s.ucet_id = g.org_ucet_id
                  where s.id = p_stranka and g.pod_segment is not null)
      then exists (select 1 from public.segmenty g join public.stranka s on s.ucet_id = g.org_ucet_id
                    where s.id = p_stranka and lower(g.pod_segment) = lower(trim(p_oblast)))
    else exists (select 1 from public.cis_segmenty c where c.aktivny and lower(c.pod_segment) = lower(trim(p_oblast)))
  end
$$;
revoke all on function public.oblast_sektora_povolena(text, text) from public, anon, authenticated;

-- 0169 + kontrola oblasti pri založení a zmene oblasti
create or replace function public.sektor_stranky_kontrola() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.upravene := now();
  if tg_op = 'UPDATE' then
    if new.stranka <> old.stranka or new.id <> old.id then raise exception 'sektor_nemenny' using errcode = '22023'; end if;
    if old.spusteny is not null and new.spusteny is null then new.spusteny := old.spusteny; end if;
    if old.ukonceny is not null and new.ukonceny is null then raise exception 'sektor_ukonceny' using errcode = '22023'; end if;
  end if;
  if coalesce(current_setting('role', true), '') in ('authenticated', 'anon') then
    if (tg_op = 'INSERT' or new.oblast is distinct from old.oblast) and not public.oblast_sektora_povolena(new.stranka, new.oblast) then
      raise exception 'oblast_mimo_stanov' using errcode = '42501';
    end if;
    if new.spusteny is not null and (tg_op = 'INSERT' or old.spusteny is null) and public.zadarmo_charita(new.stranka) then
      raise exception 'sektor_od_p1' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

commit;
