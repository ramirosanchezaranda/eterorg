import { useState } from "react";
import { ChevR, ChevD, Plus, Trash, Fold, Star, Grip } from "../icons";
import { tB } from "../ui/styles";
import { Y, sf } from "../../constants/theme";
import { uid, now } from "../../utils";

export default function DocTree({ node, depth, activeDoc: ad, setAD, docs, setDocs, t, favs, toggleFav, drag, setDrag }) {
  const [exp, setExp] = useState(true);
  const [hv, setHv] = useState(false);
  const [rn, setRn] = useState(false);
  const isF = node.type === "folder", isA = ad === node.id;

  const addC = (type) => {
    const c = { id: uid(), name: type === "folder" ? "New Folder" : "Untitled", type, content: "", icon: type === "folder" ? null : "📄", cover: null, history: [], children: type === "folder" ? [] : undefined, relatedTasks: [], createdAt: now() };
    const up = (ns) => ns.map((n) => n.id === node.id ? { ...n, children: [...(n.children || []), c] } : { ...n, children: n.children ? up(n.children) : n.children });
    setDocs(up(docs));
    if (type !== "folder") setAD(c.id);
  };

  const rm = () => {
    const f = (ns) => ns.filter((n) => n.id !== node.id).map((n) => ({ ...n, children: n.children ? f(n.children) : n.children }));
    setDocs(f(docs));
    if (isA) setAD(null);
    return node;
  };

  const ren = (v) => {
    const u = (ns) => ns.map((n) => n.id === node.id ? { ...n, name: v } : { ...n, children: n.children ? u(n.children) : n.children });
    setDocs(u(docs));
    setRn(false);
  };

  return (
    <div
      draggable={!rn}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", node.id); setDrag({ d: node.id }); }}
      onDragEnd={() => setDrag(null)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation();
        const sid = e.dataTransfer.getData("text/plain");
        if (sid === node.id || !isF) return;
        let sn = null;
        const rs = (ns) => ns.filter((n) => { if (n.id === sid) { sn = n; return false; } if (n.children) n.children = rs(n.children); return true; });
        const nd = rs(JSON.parse(JSON.stringify(docs)));
        if (sn) {
          const at = (ns) => ns.map((n) => n.id === node.id ? { ...n, children: [...(n.children || []), sn] } : { ...n, children: n.children ? at(n.children) : n.children });
          setDocs(at(nd));
        }
        setDrag(null);
      }}
    >
      <div
        onClick={() => (isF ? setExp(!exp) : setAD(node.id))}
        onDoubleClick={() => setRn(true)}
        onMouseEnter={() => setHv(true)}
        onMouseLeave={() => setHv(false)}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: `4px 6px 4px ${10 + depth * 16}px`, cursor: "pointer", borderRadius: 7, fontSize: 12.5, fontWeight: isA ? 500 : 400, color: isA ? t.fg : t.mt, background: isA ? t.at : hv ? t.hv : "transparent", transition: "all .12s", userSelect: "none", minHeight: 28 }}
      >
        {hv && <span style={{ cursor: "grab", color: t.mt, opacity: .4, flexShrink: 0, marginRight: -2 }}><Grip s={11} /></span>}
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", opacity: .6, fontSize: 11 }}>{isF ? (exp ? <ChevD s={11} /> : <ChevR s={11} />) : <span>{node.icon || "📄"}</span>}</span>
        {rn
          ? <input autoFocus defaultValue={node.name} onBlur={(e) => ren(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ren(e.target.value); if (e.key === "Escape") setRn(false); }} onClick={(e) => e.stopPropagation()} style={{ flex: 1, fontSize: 12, border: `1px solid ${t.bd}`, borderRadius: 4, background: t.inp, color: t.fg, padding: "1px 5px", fontFamily: sf, outline: "none" }} />
          : <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>}
        {hv && !rn && (
          <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
            {node.type === "doc" && <button onClick={() => toggleFav(node.id)} style={{ ...tB(t), width: 18, height: 18 }}><Star s={9} c={favs.includes(node.id) ? Y : t.mt} /></button>}
            {isF && <button onClick={() => addC("doc")} style={{ ...tB(t), width: 18, height: 18 }}><Plus s={9} /></button>}
            {isF && <button onClick={() => addC("folder")} style={{ ...tB(t), width: 18, height: 18 }}><Fold s={8} /></button>}
            <button onClick={rm} style={{ ...tB(t), width: 18, height: 18 }}><Trash s={8} /></button>
          </div>
        )}
      </div>
      {isF && exp && node.children && node.children.map((c) => (
        <DocTree key={c.id} node={c} depth={depth + 1} activeDoc={ad} setAD={setAD} docs={docs} setDocs={setDocs} t={t} favs={favs} toggleFav={toggleFav} drag={drag} setDrag={setDrag} />
      ))}
    </div>
  );
}
