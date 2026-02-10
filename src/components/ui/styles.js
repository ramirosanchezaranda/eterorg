import { sf } from "../../constants/theme";

/* ═══════ BUTTON STYLE HELPERS ═══════ */
export const tB = (t) => ({
  width: 22, height: 22, borderRadius: 6, border: "none",
  background: t.hv, color: t.mt, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, flexShrink: 0,
});

export const sB = (t) => ({
  width: 30, height: 30, borderRadius: 8,
  border: `1px solid ${t.bd}`, background: "transparent",
  color: t.mt, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, flexShrink: 0,
});

export const pill = (c) => ({
  fontSize: 10, fontFamily: sf, color: c, fontWeight: 600,
  background: `${c}14`, padding: "2px 7px", borderRadius: 5,
  border: `1.5px solid ${c}30`,
  display: "inline-flex", alignItems: "center", gap: 3,
});
