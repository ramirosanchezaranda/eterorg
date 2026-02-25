import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { B, sf } from "../../constants/theme";
import { FileT } from "../icons";

export default function GalleryView({ docs, setAD, setV, onAddDoc, t, T, onDeleteDoc, onAiHelp }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const rootRef = useRef(null);
  const menuRef = useRef(null);

  const clamp = (value, min, max = Infinity) => Math.min(max, Math.max(min, value));
  const safeNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback);

  const closeMenu = () => {
    setContextMenu(null);
  };

  const getMenuPosFromCardAnchor = (anchorRect, menuW = 170, menuH = 132, gap = 4, margin = 8) => {
    const viewportW = safeNumber(window.innerWidth, menuW + margin * 2);
    const viewportH = safeNumber(window.innerHeight, menuH + margin * 2);

    const anchorLeft = safeNumber(anchorRect?.left, margin);
    const anchorTop = safeNumber(anchorRect?.top, margin);
    const anchorRight = safeNumber(anchorRect?.right, anchorLeft);
    const anchorBottom = safeNumber(anchorRect?.bottom, anchorTop);

    // Desktop preferred position: from the BOTTOM-RIGHT corner, outside and below the card.
    let x = anchorRight - menuW;
    let y = anchorBottom + gap;

    // If there is no room below, fallback above the bottom edge.
    if (y + menuH > viewportH - margin) y = anchorBottom - menuH - gap;

    const maxX = Math.max(margin, viewportW - menuW - margin);
    const maxY = Math.max(margin, viewportH - menuH - margin);

    return {
      x: clamp(x, margin, maxX),
      y: clamp(y, margin, maxY),
    };
  };

  const getMenuPosFromButtonAnchor = (anchorRect, menuW = 170, menuH = 132, gap = 6, margin = 8) => {
    const viewportW = safeNumber(window.innerWidth, menuW + margin * 2);
    const viewportH = safeNumber(window.innerHeight, menuH + margin * 2);

    const anchorLeft = safeNumber(anchorRect?.left, margin);
    const anchorTop = safeNumber(anchorRect?.top, margin);
    const anchorRight = safeNumber(anchorRect?.right, anchorLeft);
    const anchorBottom = safeNumber(anchorRect?.bottom, anchorTop);

    // Mobile preferred position: below the "..." trigger.
    let x = anchorRight - menuW;
    let y = anchorBottom + gap;

    // If no space below, open above the button.
    if (y + menuH > viewportH - margin) y = anchorTop - menuH - gap;

    const maxX = Math.max(margin, viewportW - menuW - margin);
    const maxY = Math.max(margin, viewportH - menuH - margin);

    return {
      x: clamp(x, margin, maxX),
      y: clamp(y, margin, maxY),
    };
  };

  const openMenuFromCard = (doc, anchorEl) => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const anchorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    const { x, y } = getMenuPosFromCardAnchor(anchorRect);
    setContextMenu({ x, y, doc, anchorRect, anchorType: "card" });
  };

  const openMenuFromButton = (doc, buttonEl) => {
    if (!buttonEl) return;
    const rect = buttonEl.getBoundingClientRect();
    const anchorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    const { x, y } = getMenuPosFromButtonAnchor(anchorRect);
    setContextMenu({ x, y, doc, anchorRect, anchorType: "button" });
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!contextMenu?.anchorRect || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const resolver = contextMenu.anchorType === "button" ? getMenuPosFromButtonAnchor : getMenuPosFromCardAnchor;
    const { x: nextX, y: nextY } = resolver(contextMenu.anchorRect, rect.width, rect.height);

    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev));
    }
  }, [contextMenu]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      closeMenu();
    };

    const handleContextOutsideCard = (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) {
        closeMenu();
        return;
      }

      if (!rootRef.current?.contains(target)) {
        closeMenu();
        return;
      }

      const clickedCard = target.closest('[data-gallery-card="true"]');
      if (!clickedCard) closeMenu();
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    const handleViewportChange = () => closeMenu();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("contextmenu", handleContextOutsideCard);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("contextmenu", handleContextOutsideCard);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, []);

  const allDocs = useMemo(() => {
    const r = [];
    const w = (ns) => ns.forEach((n) => { if (n.type === "doc") r.push(n); if (n.children) w(n.children); });
    w(docs);
    return r;
  }, [docs]);

  const handleContextMenu = (e, doc) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    // Desktop: open anchored to the clicked card (bottom-right corner, below by default).
    openMenuFromCard(doc, e.currentTarget);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const doc = contextMenu?.doc;
    if (doc) {
      setAD(doc.id);
      setV("docs");
    }
    closeMenu();
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const doc = contextMenu?.doc;
    if (doc && onDeleteDoc) {
      onDeleteDoc(doc.id);
    }
    closeMenu();
  };

  const handleAiHelp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const doc = contextMenu?.doc;
    if (doc && onAiHelp) {
      onAiHelp(doc);
    }
    closeMenu();
  };

  return (
    <div className="fi" ref={rootRef}>
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
                data-gallery-card="true"
                onClick={(e) => { e.stopPropagation(); setAD(d.id); setV("docs"); }} 
                onContextMenu={(e) => handleContextMenu(e, d)}
                style={{ border: `1px solid ${t.bd}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all .15s", background: t.card, position: "relative" }} 
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")} 
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                {isMobile && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openMenuFromButton(d, e.currentTarget);
                    }}
                    aria-label="More"
                    title="..."
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 24,
                      borderRadius: 8,
                      border: `1px solid ${t.bd}`,
                      background: t.card,
                      color: t.mt,
                      cursor: "pointer",
                      zIndex: 5,
                      fontFamily: sf,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                    }}
                  >
                    ...
                  </button>
                )}
                <div style={{ height: 80, background: d.cover || `${B}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>{!d.cover && <span style={{ fontSize: 32, opacity: .5 }}>{d.icon || "📄"}</span>}</div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: sf }}>{d.icon || "📄"} {d.name}</div>
                  <p style={{ fontSize: 11, color: t.mt, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", fontFamily: sf }}>{(d.content || "").replace(/[#*>\-![\]|`]/g, "").slice(0, 120) || T("emptyDocument")}</p>
                </div>
              </div>
            ))}
          </div>}
      {contextMenu && createPortal(
        <div 
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
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
        </div>,
        document.body
      )}
    </div>
  );
}
