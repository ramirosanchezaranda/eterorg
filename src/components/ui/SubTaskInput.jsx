import { useState } from "react";
import { Plus } from "../icons";
import { tB } from "./styles";
import { G, sf } from "../../constants/theme";

export default function SubTaskInput({ taskId, addSub, t, T }) {
  const [show, setShow] = useState(false);
  const [v, setV] = useState("");

  if (!show)
    return (
      <button onClick={() => setShow(true)} style={{ border: "none", background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 11, padding: "4px 0", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        <Plus s={10} />{T("subTask")}
      </button>
    );

  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { addSub(taskId, v); setV(""); } if (e.key === "Escape") setShow(false); }}
        placeholder={T("subTaskPlaceholder")}
        style={{ flex: 1, height: 28, borderRadius: 6, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 8px", fontFamily: sf, fontSize: 12 }} />
      <button onClick={() => { if (v.trim()) { addSub(taskId, v); setV(""); } }} style={{ ...tB(t), width: 28, height: 28, background: G, color: "#fff", borderRadius: 6 }}><Plus s={10} /></button>
      <button onClick={() => setShow(false)} style={{ ...tB(t), width: 28, height: 28 }}>×</button>
    </div>
  );
}
