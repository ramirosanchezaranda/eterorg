import { XI } from "../icons";
import { tB } from "./styles";
import { sf } from "../../constants/theme";

export default function Toasts({ items, onDismiss, t }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 5000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
      {items.map((n) => (
        <div key={n.id} className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
          <span style={{ fontSize: 16 }}>{n.icon || "🔔"}</span>
          <span style={{ flex: 1, fontSize: 13, fontFamily: sf }}>{n.text}</span>
          <button onClick={() => onDismiss(n.id)} style={{ ...tB(t), width: 20, height: 20 }}><XI s={10} /></button>
        </div>
      ))}
    </div>
  );
}
