import { createRoot } from "react-dom/client";
import { Companion } from "../src/App";
const scale = Number(new URLSearchParams(location.search).get("s") || "0.8");
createRoot(document.getElementById("r") as HTMLElement).render(
  <div style={{ width: 1024, height: 1024, display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 35% 25%, #FFFFFF 0%, #EEF3FF 38%, #D6E2FF 100%)", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 120, top: 150, width: 26, height: 26, borderRadius: 13, background: "#FFD978", opacity: 0.8 }} />
    <div style={{ position: "absolute", right: 150, top: 210, width: 18, height: 18, borderRadius: 9, background: "#FFB3C7", opacity: 0.8 }} />
    <div style={{ width: 1024 * scale, marginTop: 40 }}><Companion kind="bean" mini /></div>
  </div>,
);
