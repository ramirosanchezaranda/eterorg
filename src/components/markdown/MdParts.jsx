import { useState } from "react";
import { G, R, Y, B, sf, sm } from "../../constants/theme";

export function Toggle({ title, content, t }) {
  const [o, setO] = useState(false);
  return (
    <div style={{ margin: "8px 0", borderRadius: 8, border: `1px solid ${t.bd}`, overflow: "hidden" }}>
      <div onClick={() => setO(!o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", background: t.card, fontSize: 14, fontWeight: 500 }}>
        <span style={{ transition: "transform .2s", transform: o ? "rotate(90deg)" : "rotate(0)" }}>▸</span>{title}
      </div>
      {o && <div style={{ padding: "10px 14px 14px", fontSize: 14, lineHeight: 1.7, color: t.fg, borderTop: `1px solid ${t.bd}` }}>{content}</div>}
    </div>
  );
}

export function Callout({ type, text, t }) {
  const m = { tip: { i: "💡", c: G }, warning: { i: "⚠️", c: Y }, danger: { i: "🔴", c: R }, info: { i: "ℹ️", c: B }, success: { i: "✅", c: G } };
  const s = m[type] || m.info;
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 16px", margin: "10px 0", borderRadius: 10, background: `${s.c}12`, borderLeft: `3px solid ${s.c}`, fontSize: 14, lineHeight: 1.6 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{s.i}</span><span>{text}</span>
    </div>
  );
}

export function MdTbl({ lines, t }) {
  const rows = lines.filter((l) => !l.match(/^\|[\s-|]+\|$/)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  if (!rows.length) return null;
  const [hd, ...bd] = rows;
  return (
    <div style={{ overflowX: "auto", margin: "12px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: sf }}>
        <thead><tr>{hd.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `2px solid ${t.bd}`, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: t.mt }}>{h}</th>)}</tr></thead>
        <tbody>{bd.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: "8px 12px", borderBottom: `1px solid ${t.bd}`, color: t.fg }}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
