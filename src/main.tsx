import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { initPwa } from "./lib/pwa";
import { naplanujPripomienky } from "./lib/pripomienky";
import { OverlayStranka, splitZCesty } from "./features/overlay/OverlayStranka";
import "./index.css";

// Počítadlo do streamu je SAMOSTATNÁ stránka, nie obrazovka appky: beží
// v OBS, nesmie mať hlavičku, menu, session ani service worker. Preto sa
// odbočuje hneď tu, pred celou appkou.
const split = typeof window !== "undefined" ? splitZCesty(window.location.pathname) : null;

if (split) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <OverlayStranka splitId={split} />
    </React.StrictMode>
  );
} else {
  initPwa(); // service worker + update prompt (v dev no-op)
  naplanujPripomienky(); // spusti splatné pripomienky + naplánuj nadchádzajúce (24 h)

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
