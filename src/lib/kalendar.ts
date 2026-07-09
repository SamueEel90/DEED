// ============================================================
// DEED · Kalendár — export udalosti do .ics (iCalendar RFC 5545).
// „Pripomeň" stiahne súbor, ktorý telefón/PC otvorí v natívnom
// kalendári (vrátane pripomienky hodinu vopred). Bez závislostí.
// ============================================================

// text do ICS poľa — escapovanie , ; \ a nových riadkov
const ics = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\r?\n/g, "\\n");

const datumKompakt = (iso: string) => iso.replace(/-/g, "");

export interface IcsUdalost {
  id: string;
  nazov: string;
  datum: string;      // ISO deň (YYYY-MM-DD)
  cas?: string;       // "HH:MM" — bez času = celodenná
  trvanieMin?: number; // default 60
  miesto?: string;
  popis?: string;
}

/** Zostaví obsah .ics súboru (jedna udalosť + pripomienka 60 min vopred). */
export function icsObsah(u: IcsUdalost): string {
  const teraz = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  let zaciatok: string, koniec: string;
  if (u.cas) {
    const [h, m] = u.cas.split(":").map(Number);
    zaciatok = `DTSTART:${datumKompakt(u.datum)}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const kon = new Date(2000, 0, 1, h, m + (u.trvanieMin ?? 60));
    koniec = `DTEND:${datumKompakt(u.datum)}T${String(kon.getHours()).padStart(2, "0")}${String(kon.getMinutes()).padStart(2, "0")}00`;
  } else {
    zaciatok = `DTSTART;VALUE=DATE:${datumKompakt(u.datum)}`;
    koniec = "";
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DEED//platforma dobra//SK",
    "BEGIN:VEVENT",
    `UID:deed-${u.id}@deed.sk`,
    `DTSTAMP:${teraz}`,
    zaciatok,
    koniec,
    `SUMMARY:${ics(u.nazov)}`,
    u.miesto ? `LOCATION:${ics(u.miesto)}` : "",
    u.popis ? `DESCRIPTION:${ics(u.popis)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${ics(u.nazov)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

/** Stiahne udalosť ako .ics — OS ju ponúkne pridať do kalendára. */
export function stiahniIcs(u: IcsUdalost, toast?: (m: string) => void): void {
  const blob = new Blob([icsObsah(u)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deed-${u.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast?.("Udalosť stiahnutá — otvor ju a pridá sa do kalendára 🔔");
}
