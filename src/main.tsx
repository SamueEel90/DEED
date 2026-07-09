import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { initPwa } from "./lib/pwa";
import { naplanujPripomienky } from "./lib/pripomienky";
import "./index.css";

initPwa(); // service worker + update prompt (v dev no-op)
naplanujPripomienky(); // spusti splatné pripomienky + naplánuj nadchádzajúce (24 h)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
