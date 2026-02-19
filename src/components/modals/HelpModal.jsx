import { HelpI } from "../icons";
import { sf, sm } from "../../constants/theme";

const sections = [
  ["helpTimersTitle", "helpTimersDesc"],
  ["helpBoardTitle", "helpBoardDesc"],
  ["helpTableTitle", "helpTableDesc"],
  ["helpCalendarTitle", "helpCalendarDesc"],
  ["helpGalleryTitle", "helpGalleryDesc"],
  ["helpDocsTitle", "helpDocsDesc"],
  ["helpAITitle", "helpAIDesc"],
  ["helpSearchTitle", "helpSearchDesc"],
  ["helpSlashTitle", "helpSlashDesc"],
  ["helpWikiTitle", "helpWikiDesc"],
  ["helpFiltersTitle", "helpFiltersDesc"],
  ["helpSubtasksTitle", "helpSubtasksDesc"],
  ["helpRemindersTitle", "helpRemindersDesc"],
  ["helpTrashTitle", "helpTrashDesc"],
  ["helpTemplatesTitle", "helpTemplatesDesc"],
  ["helpNotificationsTitle", "helpNotificationsDesc"],
];

const shortcuts = [
  ["Ctrl / ⌘ + B", "helpShortcutSearch"],
  ["Ctrl / ⌘ + H", "helpShortcutHelp"],
  ["Esc", "helpShortcutEsc"],
];

export default function HelpModal({ open, onClose, t, T }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="modal-overlay" style={{
      position: "fixed", inset: 0, zIndex: 2000, background: t.ov,
      backdropFilter: "blur(8px)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{
        width: "100%", maxWidth: 520, background: t.bg,
        border: `1px solid ${t.bd}`, borderRadius: 16,
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)",
      }}>
        {/* Header — matches SearchModal */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: `1px solid ${t.bd}`,
        }}>
          <HelpI s={16} c={t.mt} />
          <span style={{ flex: 1, fontSize: 15, fontFamily: sf, fontWeight: 600, color: t.fg }}>
            {T("helpTitle")}
          </span>
          <kbd onClick={onClose} style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            border: `1px solid ${t.bd}`, color: t.mt, fontFamily: sm,
            cursor: "pointer", background: "transparent",
          }}>ESC</kbd>
        </div>

        {/* Scrollable body */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
          {/* Feature sections */}
          {sections.map(([titleKey, descKey]) => (
            <div key={titleKey} style={{ padding: "8px 10px" }}>
              <h3 style={{
                fontSize: 13, fontWeight: 700, fontFamily: sf,
                marginBottom: 4, margin: 0, color: t.fg,
              }}>
                {T(titleKey)}
              </h3>
              <p style={{
                fontSize: 12, lineHeight: 1.6, color: t.mt,
                fontFamily: sf, margin: 0,
              }}>
                {T(descKey)}
              </p>
            </div>
          ))}

          {/* Keyboard shortcuts — hidden on small screens via CSS */}
          <div className="help-shortcuts-section" style={{ padding: "8px 10px", marginTop: 4 }}>
            <h3 style={{
              fontSize: 13, fontWeight: 700, fontFamily: sf,
                marginBottom: 8, margin: 0, color: t.fg,
            }}>
              {T("helpShortcutsTitle")}
            </h3>
            {shortcuts.map(([keys, descKey]) => (
              <div key={keys} style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 6,
              }}>
                <kbd style={{
                  fontFamily: sm, fontSize: 11, background: t.inp,
                  border: `1px solid ${t.bd}`, borderRadius: 5,
                  padding: "2px 8px", color: t.fg, whiteSpace: "nowrap",
                }}>
                  {keys}
                </kbd>
                <span style={{ fontSize: 12, color: t.mt, fontFamily: sf }}>
                  {T(descKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
