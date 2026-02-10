import { useCallback } from "react";
import { Toggle, Callout, MdTbl } from "../components/markdown/MdParts";
import { R, G, B, sf, sm } from "../constants/theme";

/* ═══════ INLINE MARKDOWN ═══════ */
export function inl(text, t, find, setAD, setV) {
  const parts = [];
  let k = 0, li = 0;
  const rx = /(\[\[([^\]]+)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > li) parts.push(<span key={k++}>{text.slice(li, m.index)}</span>);
    if (m[2]) {
      const d = find(m[2]);
      parts.push(<span key={k++} onClick={() => { if (d) { setAD(d.id); setV("docs"); } }} style={{ color: B, cursor: d ? "pointer" : "default", borderBottom: `1px solid ${B}40`, fontWeight: 500, padding: "0 1px" }}>{m[2]}{!d && " ↗"}</span>);
    } else if (m[3]) parts.push(<strong key={k++}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={k++}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={k++} style={{ background: t.inp, padding: "2px 6px", borderRadius: 4, fontFamily: sm, fontSize: 12 }}>{m[5]}</code>);
    li = m.index + m[0].length;
  }
  if (li < text.length) parts.push(<span key={k++}>{text.slice(li)}</span>);
  return parts.length ? parts : text;
}

/* ═══════ MARKDOWN RENDERER HOOK ═══════ */
export default function useMd(t, docs, setActiveDoc, setView, T) {
  const findByName = useCallback((name) => {
    const s = (ns) => { for (const n of ns) { if (n.name === name && n.type === "doc") return n; if (n.children) { const f = s(n.children); if (f) return f; } } return null; };
    return s(docs);
  }, [docs]);

  return useCallback((text) => {
    if (!text) return <p style={{ color: t.mt, fontStyle: "italic", fontSize: 13 }}>{T ? T("emptyDocument") : "Empty document…"}</p>;
    const lines = text.split("\n"), els = [];
    let i = 0;
    while (i < lines.length) {
      const L = lines[i];
      if (L.startsWith(">>> ")) { const title = L.slice(4), ct = []; i++; while (i < lines.length && lines[i].startsWith("  ")) { ct.push(lines[i].slice(2)); i++; } els.push(<Toggle key={`t${i}`} title={title} content={ct.join("\n")} t={t} />); continue; }
      if (L.startsWith("!!! ")) { const m = L.match(/^!!! (\w+) (.+)/); if (m) { els.push(<Callout key={`c${i}`} type={m[1]} text={m[2]} t={t} />); i++; continue; } }
      if (L.includes("|") && L.trim().startsWith("|")) { const tl = []; while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) { tl.push(lines[i]); i++; } els.push(<MdTbl key={`tb${i}`} lines={tl} t={t} />); continue; }
      if (L.startsWith("### ")) { els.push(<h3 key={i} style={{ fontSize: 16, fontWeight: 600, margin: "18px 0 6px", fontFamily: sf }}>{L.slice(4)}</h3>); i++; continue; }
      if (L.startsWith("## ")) { els.push(<h2 key={i} style={{ fontSize: 19, fontWeight: 600, margin: "22px 0 8px", fontFamily: sf }}>{L.slice(3)}</h2>); i++; continue; }
      if (L.startsWith("# ")) { els.push(<h1 key={i} style={{ fontSize: 24, fontWeight: 700, margin: "26px 0 10px", fontFamily: sf }}>{L.slice(2)}</h1>); i++; continue; }
      if (L.startsWith("![")) { const m = L.match(/!\[([^\]]*)\]\(([^)]+)\)/); if (m) { els.push(<img key={i} src={m[2]} alt={m[1]} style={{ maxWidth: "100%", borderRadius: 10, margin: "12px 0", border: `1px solid ${t.bd}` }} />); i++; continue; } }
      if (L.startsWith("[video](")) { const m = L.match(/\[video\]\(([^)]+)\)/); if (m) { els.push(<video key={i} src={m[1]} controls style={{ maxWidth: "100%", borderRadius: 10, margin: "12px 0" }} />); i++; continue; } }
      if (L.startsWith("- [ ] ") || L.startsWith("- [x] ")) { const ck = L.startsWith("- [x]"); els.push(<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4, fontSize: 14, lineHeight: 1.7, color: ck ? t.mt : t.fg }}><span style={{ width: 16, height: 16, borderRadius: 4, border: ck ? "none" : `1.5px solid ${t.bd}`, background: ck ? G : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0 }}>{ck ? "✓" : ""}</span><span style={{ textDecoration: ck ? "line-through" : "none" }}>{L.slice(6)}</span></div>); i++; continue; }
      if (L.startsWith("- ")) { els.push(<li key={i} style={{ marginLeft: 18, fontSize: 14, lineHeight: 1.7, color: t.fg }}>{inl(L.slice(2), t, findByName, setActiveDoc, setView)}</li>); i++; continue; }
      if (L.startsWith("> ")) { els.push(<blockquote key={i} style={{ borderLeft: `3px solid ${R}`, paddingLeft: 14, margin: "10px 0", color: t.mt, fontStyle: "italic", fontSize: 14 }}>{L.slice(2)}</blockquote>); i++; continue; }
      if (L.trim() === "---") { els.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${t.bd}`, margin: "20px 0" }} />); i++; continue; }
      if (L.trim() === "") { els.push(<div key={i} style={{ height: 10 }} />); i++; continue; }
      els.push(<p key={i} style={{ fontSize: 14, lineHeight: 1.75, margin: "4px 0" }}>{inl(L, t, findByName, setActiveDoc, setView)}</p>); i++;
    }
    return els;
  }, [t, findByName, setActiveDoc, setView, T]);
}
