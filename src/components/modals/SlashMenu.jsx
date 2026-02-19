import { SLASH } from "../../constants";
import { sf } from "../../constants/theme";

export default function SlashMenu({ query, onSelect, pos, t, T }) {
  const fl = SLASH.filter((c) => T(c.lk).toLowerCase().includes(query.toLowerCase()));
  // Sort so AI/voice commands appear first when query matches them, otherwise regular first then AI
  const sorted = query.length > 0 ? fl : [...fl.filter((c) => !c.ai && !c.voice), ...fl.filter((c) => c.ai || c.voice)];
  if (!sorted.length) return null;

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 3000, width: 220, maxHeight: 320, overflowY: "auto", background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 10, padding: 4, boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
      {sorted.map((c) => (
        <button key={c.cmd} onClick={() => onSelect(c)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 12, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = t.hv)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: c.ai ? "rgba(139,92,246,.12)" : c.voice ? "rgba(214,50,48,.12)" : t.card, border: `1px solid ${c.ai ? "rgba(139,92,246,.25)" : c.voice ? "rgba(214,50,48,.25)" : t.bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: c.ai ? "#8B5CF6" : c.voice ? "#D63230" : undefined }}>{c.ic}</span>
          <span>{T(c.lk)}</span>
          {c.ai && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "#8B5CF6", background: "rgba(139,92,246,.1)", padding: "1px 5px", borderRadius: 4 }}>AI</span>}
          {c.voice && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "#D63230", background: "rgba(214,50,48,.1)", padding: "1px 5px", borderRadius: 4 }}>🎙️</span>}
        </button>
      ))}
    </div>
  );
}
