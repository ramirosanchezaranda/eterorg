import { XI } from "../icons";
import { sB } from "../ui/styles";
import { R, G, sf } from "../../constants/theme";

export default function TrashModal({ trash, onRestore, onPermanent, onClose, t, T }) {
  return (
    <div onClick={onClose} className="modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 1000, background: t.ov, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.bd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>🗑️ {T("trash")}</h3>
          <button onClick={onClose} style={{ ...sB(t), width: 30, height: 30 }}><XI s={13} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {!trash.length
            ? <div style={{ padding: 30, textAlign: "center", color: t.mt, fontSize: 13 }}>{T("trashEmpty")}</div>
            : trash.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, borderBottom: `1px solid ${t.bd}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.itemType === "task" ? "⏱" : "📄"} {item.name}</div>
                  <div style={{ fontSize: 10, color: t.mt, fontFamily: sf }}>{item.deletedAt}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onRestore(i)} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: `1px solid ${t.bd}`, background: "transparent", color: G, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>{T("restore")}</button>
                  <button onClick={() => onPermanent(i)} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: `1px solid ${R}30`, background: `${R}10`, color: R, cursor: "pointer", fontSize: 11, fontWeight: 500 }}>{T("delete")}</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
