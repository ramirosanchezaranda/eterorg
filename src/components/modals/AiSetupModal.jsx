import { useState } from "react";
import { Sparkle } from "../icons";
import { R, G, B, sf, sm } from "../../constants/theme";

export default function AiSetupModal({ open, onClose, onSave, hasKey, t, T }) {
  const [key, setKey] = useState("");
  if (!open) return null;

  const steps = [
    { icon: "1️⃣", title: T("aiStep1Title"), desc: T("aiStep1Desc") },
    { icon: "2️⃣", title: T("aiStep2Title"), desc: T("aiStep2Desc") },
    { icon: "3️⃣", title: T("aiStep3Title"), desc: T("aiStep3Desc") },
  ];

  const features = [
    { icon: "📝", text: T("aiFeat1") },
    { icon: "⏱", text: T("aiFeat2") },
    { icon: "🏷", text: T("aiFeat3") },
    { icon: "💾", text: T("aiFeat4") },
  ];

  return (
    <div onClick={onClose} className="modal-overlay" style={{
      position: "fixed", inset: 0, zIndex: 2000, background: t.ov,
      backdropFilter: "blur(8px)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{
        width: "100%", maxWidth: 520, background: t.bg,
        border: `1px solid ${t.bd}`, borderRadius: 16,
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.3)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderBottom: `1px solid ${t.bd}`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: `${R}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Sparkle s={14} c={R} /></div>
          <span style={{ flex: 1, fontSize: 15, fontFamily: sf, fontWeight: 600, color: t.fg }}>
            {T("aiSetupTitle")}
          </span>
          <kbd onClick={onClose} style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            border: `1px solid ${t.bd}`, color: t.mt, fontFamily: sm,
            cursor: "pointer", background: "transparent",
          }}>ESC</kbd>
        </div>

        {/* Body */}
        <div style={{ maxHeight: 420, overflowY: "auto", padding: "16px 18px" }}>
          {/* Intro */}
          <p style={{ fontSize: 13, lineHeight: 1.7, color: t.fg, fontFamily: sf, marginBottom: 16 }}>
            {T("aiSetupIntro")}
          </p>

          {/* How it works */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.mt, marginBottom: 8, fontFamily: sf }}>
              {T("aiHowItWorks")}
            </h4>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: t.fg, fontFamily: sf, lineHeight: 1.5 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Setup steps */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.mt, marginBottom: 8, fontFamily: sf }}>
              {T("aiSetupSteps")}
            </h4>
            {steps.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px",
                background: t.card, borderRadius: 8, marginBottom: 4,
              }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: sf, color: t.fg }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: t.mt, fontFamily: sf, lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Security note */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px",
            background: `${B}08`, borderRadius: 8, border: `1px solid ${B}20`, marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: 11, color: t.fg, fontFamily: sf, lineHeight: 1.5 }}>
              {T("aiSecurityNote")}
            </span>
          </div>

          {/* API Key input */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.mt, fontFamily: sf, display: "block", marginBottom: 6 }}>
              API Key
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="gsk_..."
                style={{
                  flex: 1, height: 38, borderRadius: 8, border: `1px solid ${t.bd}`,
                  background: t.inp, color: t.fg, padding: "0 12px",
                  fontFamily: sf, fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={() => { if (key.trim()) { onSave(key.trim()); setKey(""); } }}
                disabled={!key.trim()}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 8, border: "none",
                  background: key.trim() ? G : `${G}30`, color: key.trim() ? "#fff" : `${G}60`,
                  cursor: key.trim() ? "pointer" : "not-allowed",
                  fontFamily: sf, fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                {T("save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
