import { useState, useEffect, useRef, useMemo } from "react";
import { SearchI, XI } from "../icons";
import { tB } from "../ui/styles";
import { G, Y, sf, sm } from "../../constants/theme";
import { fmt } from "../../utils";

export default function SearchModal({ open, onClose, tasks, docs, setAD, setV, t, T }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open && ref.current) { ref.current.focus(); setQ(""); } }, [open]);

  const flatD = useMemo(() => {
    const r = [];
    const w = (ns, p = "") => ns.forEach((n) => { r.push({ ...n, path: p ? `${p}/${n.name}` : n.name }); if (n.children) w(n.children, p ? `${p}/${n.name}` : n.name); });
    w(docs);
    return r;
  }, [docs]);

  const res = useMemo(() => {
    const lq = q.toLowerCase();
    if (!q.trim()) return { d: flatD.filter((d) => d.type === "doc").slice(0, 5), tk: tasks.slice(0, 5) };
    return {
      d: flatD.filter((d) => d.type === "doc" && (d.name.toLowerCase().includes(lq) || (d.content || "").toLowerCase().includes(lq))).slice(0, 8),
      tk: tasks.filter((t) => t.name.toLowerCase().includes(lq)).slice(0, 8),
    };
  }, [q, flatD, tasks]);

  if (!open) return null;

  return (
    <div onClick={onClose} className="modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 2000, background: t.ov, backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{ width: "100%", maxWidth: 520, background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${t.bd}` }}>
          <SearchI s={16} c={t.mt} />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder={T("searchPlaceholder")} style={{ flex: 1, border: "none", background: "transparent", color: t.fg, fontSize: 15, fontFamily: sf, outline: "none" }} />
          <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${t.bd}`, color: t.mt, fontFamily: sm }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
          {res.d.length > 0 && <div>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "8px 10px 4px", fontFamily: sf }}>{T("documents")}</div>
            {res.d.map((d) => <button key={d.id} onClick={() => { setAD(d.id); setV("docs"); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 13, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = t.hv)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><span style={{ fontSize: 14 }}>{d.icon || "📄"}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500 }}>{d.name}</div></div></button>)}
          </div>}
          {res.tk.length > 0 && <div>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "8px 10px 4px", fontFamily: sf, marginTop: 4 }}>{T("tasks")}</div>
            {res.tk.map((tk) => <button key={tk.id} onClick={() => { setV("timers"); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 13, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = t.hv)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><div style={{ width: 7, height: 7, borderRadius: "50%", background: tk.done ? G : tk.running ? Y : t.bd, flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{tk.name}</div></div><span style={{ fontFamily: sf, fontSize: 11, color: t.mt }}>{fmt(tk.remaining)}</span></button>)}
          </div>}
          {!res.d.length && !res.tk.length && <div style={{ padding: 30, textAlign: "center", color: t.mt, fontSize: 13 }}>{T("noResults")}</div>}
        </div>
      </div>
    </div>
  );
}
