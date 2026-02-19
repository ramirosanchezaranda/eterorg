import { PRIOS } from "../../constants";
import { Sparkle, CheckI, XI, ArrowR } from "../icons";
import { tB, sB, pill } from "../ui/styles";
import { R, G, sf } from "../../constants/theme";

export default function TaskPreview({ tasks: aiT, onConfirm, onCancel, onToggle, onTime, t, T, docName }) {
  const sel = aiT.filter((x) => x.selected);
  const tm = sel.reduce((s, x) => s + x.minutes, 0);

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: t.ov, backdropFilter: "blur(8px)" }}>
      <div className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 12px", borderBottom: `1px solid ${t.bd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${R}18`, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkle s={16} c={R} /></div>
            <div><h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: sf }}>{T("generatedTasks")}</h3><div style={{ fontSize: 10, fontFamily: sf, color: t.mt, marginTop: 2 }}>{docName} · {sel.length} {T("tasks").toLowerCase()} · {Math.floor(tm / 60)}h{tm % 60}m</div></div>
          </div>
          <button onClick={onCancel} style={{ ...sB(t), width: 32, height: 32 }}><XI s={14} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
          {aiT.map((tk, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 8, opacity: tk.selected ? 1 : .4 }}>
              <button onClick={() => onToggle(i)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: tk.selected ? "none" : `1.5px solid ${t.bd}`, background: tk.selected ? G : "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{tk.selected && <CheckI s={11} />}</button>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{tk.name}</span>
              {tk.priority && <span style={{ ...pill(PRIOS.find((p) => p.k === tk.priority)?.c || t.mt), border: "none" }}>{tk.priority}</span>}
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <button onClick={() => onTime(i, Math.max(1, tk.minutes - 5))} style={{ ...tB(t), width: 20, height: 20 }}>−</button>
                <span style={{ fontFamily: sf, fontSize: 11, width: 38, textAlign: "center" }}>{tk.minutes}m</span>
                <button onClick={() => onTime(i, tk.minutes + 5)} style={{ ...tB(t), width: 20, height: 20 }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${t.bd}`, display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 13 }}>{T("cancel")}</button>
          <button onClick={onConfirm} style={{ flex: 2, height: 40, borderRadius: 10, border: "none", background: R, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ArrowR s={15} />{T("addNTasks")} {sel.length} {T("tasksWord")}</button>
        </div>
      </div>
    </div>
  );
}
