import { PRIOS, STS, STL_KEYS } from "../../constants";
import { FilterI, XI } from "../icons";
import { tB, pill } from "./styles";
import { sf } from "../../constants/theme";

export default function FilterBar({ filters, setFilters, t, T }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
      <span style={{ ...pill(t.mt), border: "none", background: "transparent", gap: 5 }}><FilterI s={12} />{T("filters")}</span>
      <select value={filters.priority || ""} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))} style={{ height: 28, borderRadius: 6, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 8px", cursor: "pointer" }}>
        <option value="">{T("allPriorities")}</option>
        {PRIOS.map((p) => <option key={p.k} value={p.k}>{p.k}</option>)}
      </select>
      <select value={filters.status || ""} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={{ height: 28, borderRadius: 6, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 8px", cursor: "pointer" }}>
        <option value="">{T("allStatus")}</option>
        {STS.map((s) => <option key={s} value={s}>{T(STL_KEYS[s])}</option>)}
      </select>
      <input value={filters.tag || ""} onChange={(e) => setFilters((p) => ({ ...p, tag: e.target.value }))} placeholder={T("filterTag")} style={{ height: 28, width: 90, borderRadius: 6, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 8px" }} />
      {(filters.priority || filters.status || filters.tag) && <button onClick={() => setFilters({ priority: "", status: "", tag: "" })} style={{ ...tB(t), width: 24, height: 24 }} title="Clear"><XI s={10} /></button>}
    </div>
  );
}
