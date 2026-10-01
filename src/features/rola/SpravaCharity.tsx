// KARTA 36: Správa charity je teraz všeobecná SpravaStranky s typom "charita" (jedna správa pre všetky typy).
import { SpravaStranky, type SpravaStrankyProps } from "./SpravaStranky";

export function SpravaCharity(p: Omit<SpravaStrankyProps, "typ">) {
  return <SpravaStranky {...p} typ="charita" />;
}
