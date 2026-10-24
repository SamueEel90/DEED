# Výpis rizík · spiace funkcie z čias nápadov (Fero, 24. 10. 2026)

Zadanie Martina: nájsť veci pridané kedysi ako nápady, dnes appkou NEpoužívané, ale volateľné zvonku — zamknúť/zrušiť, nasadia sa bezpečne až pri reálnom využití.

Metóda: 387 DB funkcií v migráciách × 159 funkcií, ktoré appka reálne volá → 228 appkou nevolaných; z nich 54 má VÝSLOVNÉ povolenie (grant) — tie oprava 15 NEZAVRIE, treba ich odobrať menovite.

## A · ZAMKNÚŤ HNEĎ — nepoužívané, výslovne povolené, píšu peniaze/stav
| Funkcia | Povolené komu | Riziko |
|---|---|---|
| escrow_create (0016) | **anon + authenticated** | PEniaze z ničoho — Paliho 1 000 000 € diera. |
| escrow_uvolni (0016) | anon + authenticated | uvoľnenie viazaných peňazí |
| escrow_vrat (0037) | authenticated | vrátenie viazaných peňazí |
| penazenka_dobit | authenticated | dobitie peňaženky bez platby |
| plne_prava(text) | authenticated | názov hovorí sám — preveriť a zamknúť |
| retaz_test | authenticated | testovacia reťaz naostro |
| badge_create | anon + authenticated | zakladanie odznakov komukoľvek |
| recurring_tick, platba_batch_close, platba_pending_expiruj, badge_auto_unbind, dorovnania_obnov, zbierky_po_termine, sprava_po_ukonceni_tick, pripomienky_udalosti_tick, upozornenia_suhrn_tick | viaceré anon + authenticated | cron/údržbové funkcie — smú byť LEN service_role; cudzí ich môže spúšťať v slučke alebo nasilu uzatvárať |

## B · ODOBRAŤ POVOLENIE do reálneho použitia — budúce funkcie bez appky
akcia_info, akcia_pripoj, organizujem_akciu (akcie/eventy) · ovp_zaloz, ovp_suhlas (overenie prítomnosti) · zaloz_filialku, pripoj_filialku, odpoj_filialku (pobočky) · podpora_firmy_pridaj, podpora_firmy_archiv (B2B) · atelier_prepni · zaloz_stranku · penazenka/… podľa zoznamu A. Pravidlo: grant sa vráti migráciou až vtedy, keď funkciu appka začne volať.

## C · Implicitne volateľné (~170 bez grantu) — rieši oprava 15 (revoke anon/authenticated + vypnúť automatické práva + CI skúška).

## Neriskantné nechať: smie_*, vidim_*, meno_*, *_strazca, triggery — čítacie/pomocné, mnohé volajú iné DB funkcie.

## Odporúčanie
Jedna migrácia (oprava 16, hneď za opravou 15): revoke pre celý zoznam A + B menovite; escrow a peňaženka sa NEMAŽÚ (kód ostáva, len sa zamkne) — zmažú/prerobia sa, až keď sa rozhodne o ich osude. CI skúška z opravy 15 potom stráži aj tieto.
