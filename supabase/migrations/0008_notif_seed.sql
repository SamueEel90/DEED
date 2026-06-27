-- DEED · SEED Notifikácie — vygenerované z features/notifikacie/mock.ts
-- Broadcast (ucet_id NULL). Idempotentné: zmaž broadcast seed, vlož.
-- Realtime: tabuľka je v publikácii supabase_realtime (viď migrácia 0008 hlavička).

delete from public.notifikacia where ucet_id is null;

insert into public.notifikacia (kat, ikona, col, titul, text, nove, agg, cas) values
('skutky', '✓', 'var(--a-green)', 'Skutok vyhodnotený', '+130 DEED · významný (3 riadky vo feede)', true, false, now()),
('skutky', '❤', 'var(--a-danger)', 'Jana N. podporila tvoj skutok', '+50 DEED', true, false, now() - interval '8 minutes'),
('penazenka', '♻', 'var(--a-green)', 'Reťaz dobra odoslaná', '39 DEED → Rodina po povodni', false, false, now() - interval '1 hours'),
('penazenka', '⭐', 'var(--a-gold)', 'Súhrn podpory', '1 240 mikro-podpor spojených · +124 DEED', false, true, now() - interval '2 hours'),
('sledovane', '🏥', 'var(--a-info)', 'Detská nemocnica — nová kampaň', 'Sledované · zbierka na inkubátor', false, false, now() - interval '5 hours'),
('sledovane', '🏃', 'var(--a-clay)', 'Pripomienka: Beh pre zdravie', 'Zajtra 09:00 · si prihlásený', false, false, now() - interval '6 hours'),
('socialne', '👤', 'var(--a-plum)', 'Peter chce byť tvoj priateľ', 'Žiadosť o priateľstvo', false, false, now() - interval '1 days'),
('deed', '✦', 'var(--a-teal)', 'Oznam od DEED', 'Nová funkcia: Reťaz dobra', false, false, now() - interval '2 days'),
('skutky', '✓', 'var(--a-green)', 'Skutok overený komunitou', 'Tvoj skutok potvrdili 3 susedia', true, false, now() - interval '20 minutes'),
('skutky', '❤', 'var(--a-danger)', 'Lukáš H. podporil tvoj skutok', '+30 DEED', true, false, now() - interval '40 minutes'),
('sledovane', '🌳', 'var(--a-green)', 'EkoTím Juh pridal nový skutok', 'Sledované · čistenie brehu Váhu', false, false, now() - interval '1 hours'),
('sledovane', '☕', 'var(--a-info)', 'Klub seniorov Sihoť — nová akcia', 'Spoločenský večer · piatok 18:30', false, false, now() - interval '2 hours'),
('penazenka', '💎', 'var(--a-gold)', 'Prijatý DEED', 'Eva K. ti poslala 40 DEED', false, false, now() - interval '3 hours'),
('socialne', '👥', 'var(--a-plum)', 'Zuzana P. ťa začala sledovať', 'Nový sledujúci', false, false, now() - interval '4 hours'),
('skutky', '⚠', 'var(--a-clay)', 'Námietka k skutku', 'Skutok #120018 čaká na doplnenie dôkazu', false, false, now() - interval '6 hours'),
('sledovane', '🌼', 'var(--a-info)', 'Liga proti rakovine — Deň narcisov', 'Sledované · zajtra verejná zbierka', false, false, now() - interval '8 hours'),
('penazenka', '♻', 'var(--a-green)', 'Reťaz dobra prijatá', 'Dostal si 24 DEED z reťaze dobra', false, false, now() - interval '1 days'),
('deed', '✦', 'var(--a-teal)', 'Nová úroveň karmy!', 'Dosiahol si Gold · L7', false, false, now() - interval '2 days');
