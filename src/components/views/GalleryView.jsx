import { useMemo, useState, useEffect, useRef } from "react";
import { B, sf } from "../../constants/theme";
import { FileT } from "../icons";

export default function GalleryView({ docs, setAD, setV, onAddDoc, t, T, onDeleteDoc, onAiHelp }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const handleRightClick = (e) => {
      if (e.target.closest('.card') === null) {
        setContextMenu(null);
      }
    };
    document.addEventListener("contextmenu", handleRightClick);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("contextmenu", handleRightClick);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const allDocs = useMemo(() => {
    const r = [];
    const w = (ns) => ns.forEach((n) => { if (n.type === "doc") r.push(n); if (n.children) w(n.children); });
    w(docs);
    return r;
  }, [docs]);

  const handleContextMenu = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDoc(doc);
    const menuWidth = 160;
    const menuHeight = 120;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    setContextMenu({ x, y });
  };

  const closeMenu = () => {
    setContextMenu(null);
    setSelectedDoc(null);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (selectedDoc) {
      setAD(selectedDoc.id);
      setV("docs");
    }
    closeMenu();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (selectedDoc && onDeleteDoc) {
      onDeleteDoc(selectedDoc.id);
    }
    closeMenu();
  };

  const handleAiHelp = (e) => {
    e.stopPropagation();
    if (selectedDoc && onAiHelp) {
      onAiHelp(selectedDoc);
    }
    closeMenu();
  };

  return (
    <div className="fi">
      <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 20, fontFamily: sf }}>{T("gallery")}</h2>
      {allDocs.length === 0
        ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 340 }}>
            <div className="glass-bar" style={{ textAlign: "center", padding: "40px 48px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 360 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FileT s={24} c={t.mt} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 6, letterSpacing: "-0.02em" }}>{T("galleryEmpty")}</div>
              <div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 16 }}>{T("galleryEmptyDesc")}</div>
              {onAddDoc && <button onClick={onAddDoc} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: "#2563EB", color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(37,99,235,.35)" }}>📄 {T("newDoc")}</button>}
            </div>
          </div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            {allDocs.map((d) => (
              <div 
                key={d.id} 
                onClick={(e) => { e.stopPropagation(); setAD(d.id); setV("docs"); }} 
                onContextMenu={(e) => handleContextMenu(e, d)}
                style={{ border: `1px solid ${t.bd}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all .15s", background: t.card }} 
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")} 
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <div style={{ height: 80, background: d.cover || `${B}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>{!d.cover && <span style={{ fontSize: 32, opacity: .5 }}>{d.icon || "📄"}</span>}</div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: sf }}>{d.icon || "📄"} {d.name}</div>
                  <p style={{ fontSize: 11, color: t.mt, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", fontFamily: sf }}>{(d.content || "").replace(/[#*>\-![\]|`]/g, "").slice(0, 120) || T("emptyDocument")}</p>
                </div>
              </div>
            ))}
          </div>}
      {contextMenu && (
        <div 
          ref={menuRef}
          style={{ 
            position: "fixed", 
            top: contextMenu.y, 
            left: contextMenu.x, 
            zIndex: 2000, 
            background: t.card, 
            border: `1px solid ${t.bd}`, 
            borderRadius: 10, 
            padding: "6px 0", 
            minWidth: 140, 
            boxShadow: "0 8px 24px rgba(0,0,0,.2)" 
          }}
        >
          <button onClick={handleEdit} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 13, textAlign: "left" }}>
            {T("edit")}
          </button>
          <button onClick={handleAiHelp} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 13, textAlign: "left" }}>
            {T("slashAi")}
          </button>
          <div style={{ borderTop: `1px solid ${t.bd}`, margin: "4px 0" }} />
          <button onClick={handleDelete} style={{ display: "block", width: "100%", padding: "8px 14px", border: "none", background: "transparent", color: "#EF4444", cursor: "pointer", fontFamily: sf, fontSize: 13, textAlign: "left" }}>
            {T("delete")}
          </button>
        </div>
      )}
    </div>
  );
}
