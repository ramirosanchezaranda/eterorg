import { useState, useRef, useEffect } from "react";
import { sf } from "../../constants/theme";
import { Sparkle, XI } from "../icons";

export default function AiWriteModal({ open, mode, onClose, onSubmit, loading, t, T }) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setPrompt(""); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]);

  if (!open) return null;

  const presets = {
    draft: T("slashDraft"),
    brainstorm: T("slashBrainstorm"),
    summarize: T("slashSummarize"),
    ai: T("slashAi"),
  };
  const title = presets[mode] || T("slashAi");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() && mode !== "continue" && mode !== "summarize") return;
    onSubmit(prompt.trim(), mode);
  };

  return (
    <div onClick={onClose} className="modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)" }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="glass-bar" style={{ width: "100%", maxWidth: 420, borderRadius: 20, padding: "24px 28px", background: t.bg, border: `1px solid ${t.glassBd}`, boxShadow: "0 16px 48px rgba(0,0,0,.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkle s={16} c={t.mt} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: sf, letterSpacing: "-0.02em" }}>{title}</span>
          </div>
          <button type="button" onClick={onClose} className="glass-btn" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.mt }}><XI s={12} /></button>
        </div>

        {/* Prompt input */}
        {mode !== "continue" && mode !== "summarize" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: t.mt, fontFamily: sf, display: "block", marginBottom: 6 }}>{T("aiWriteTitle")}</label>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={T("aiWritePlaceholder")}
              rows={3}
              style={{ width: "100%", resize: "vertical", padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.glassBd}`, background: t.glass, color: t.fg, fontFamily: sf, fontSize: 13, lineHeight: 1.6, outline: "none", boxSizing: "border-box" }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e); }}
            />
            <div style={{ fontSize: 10, color: t.mt, fontFamily: sf, marginTop: 4, opacity: 0.6 }}>⌘+Enter / Ctrl+Enter</div>
          </div>
        )}

        {(mode === "continue" || mode === "summarize") && (
          <div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 14, padding: "10px 12px", borderRadius: 12, background: t.glass, border: `1px solid ${t.glassBd}` }}>
            {mode === "continue" ? "The AI will continue writing from where you left off based on your document context." : "The AI will generate a concise summary of your current document."}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} className="glass-btn" style={{ height: 34, padding: "0 16px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12 }}>
            {T("cancel")}
          </button>
          <button type="submit" disabled={loading || (!prompt.trim() && mode !== "continue" && mode !== "summarize")} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: loading ? `${t.mt}40` : "#8B5CF6", color: "#fff", cursor: loading ? "wait" : "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 2px 8px rgba(139,92,246,.35)" }}>
            {loading ? (
              <>
                <div style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                {T("aiWriting")}
              </>
            ) : (
              <><Sparkle s={12} />{T("aiWriteBtn")}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
