// OPRAVY 240 · plná vrstva (stránka farnosti, detail zbierky, parte, príhovor, celá obrazovka):
// kým je otvorená, obrazovka pod ňou sa neposúva a nepruží. Počíta sa, koľko vrstiev je otvorených naraz.
import { useEffect } from "react";

let pocet = 0;
export function useZamokVrstvy(aktivne = true) {
  useEffect(() => {
    if (!aktivne || typeof document === "undefined") return;
    pocet++;
    document.documentElement.classList.add("zamok-vrstvy");
    return () => { pocet = Math.max(0, pocet - 1); if (!pocet) document.documentElement.classList.remove("zamok-vrstvy"); };
  }, [aktivne]);
}
