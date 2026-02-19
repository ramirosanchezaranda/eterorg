import { useState, useRef, useEffect } from "react";
import { R, G, Y, B, O, sf } from "../../constants/theme";
import { XI, GearI, VolumeI, VolMuteI, ExportI, ImportI, FolderOpenI, Trash, BellI, KeyI } from "../icons";
import { tB, sB } from "../ui/styles";

/* ═══════ Section icons ═══════ */
const TABS = [
  { key: "profile",       ic: "👤", lk: "settingsProfile" },
  { key: "timer",         ic: "⏱",  lk: "settingsTimer" },
  { key: "storage",       ic: "💾", lk: "settingsStorage" },
  { key: "ai",            ic: "🤖", lk: "settingsAi" },
  { key: "notifications", ic: "🔔", lk: "settingsNotifications" },
  { key: "data",          ic: "🗑️", lk: "settingsData" },
];

/* ═══════ Toggle switch ═══════ */
const Toggle = ({ on, onChange, color = G, disabled }) => (
  <button onClick={() => !disabled && onChange(!on)} style={{
    width: 38, height: 22, borderRadius: 11, border: `1.5px solid ${on ? color : "var(--bd)"}`,
    background: on ? color : "var(--inp)", cursor: disabled ? "not-allowed" : "pointer",
    position: "relative", padding: 0, flexShrink: 0, transition: "background .2s",
  }}>
    <div style={{
      width: 16, height: 16, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 1.5, left: on ? 18 : 1.5,
      transition: "left .25s cubic-bezier(.4,0,.2,1)",
    }} />
  </button>
);

/* ═══════ Section row ═══════ */
const Row = ({ label, desc, children, t }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid ${t.bd}08` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: t.fg }}>{label}</div>
      {desc && <div style={{ fontSize: 11, color: t.mt, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
    </div>
    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
  </div>
);

/* ═══════ Volume Popover (inside icon, expands upward) ═══════ */
const VolumePopover = ({ muted, volume, onMute, onVolume, t }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(!open)}
        onContextMenu={(e) => { e.preventDefault(); onMute(!muted); }}
        style={{ ...tB(t), width: 32, height: 32, borderRadius: 8, color: muted ? R : t.mt, display: "flex", alignItems: "center", justifyContent: "center" }}
        title={muted ? "Unmute" : "Mute (right-click)"}
      >
        {muted ? <VolMuteI s={14} /> : <VolumeI s={14} />}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 6, background: t.card, border: `1px solid ${t.bd}`, borderRadius: 12,
          padding: "14px 10px 10px", display: "flex", flexDirection: "column", alignItems: "center",
          gap: 6, boxShadow: "0 4px 20px rgba(0,0,0,.15)", zIndex: 10, minWidth: 40,
        }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: t.mt, fontFamily: sf }}>{Math.round(volume * 100)}%</span>
          <input
            type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onVolume(v);
              if (v > 0 && muted) onMute(false);
              if (v === 0) onMute(true);
            }}
            style={{
              writingMode: "vertical-lr", direction: "rtl",
              width: 4, height: 90, accentColor: B, cursor: "pointer", appearance: "slider-vertical",
              WebkitAppearance: "slider-vertical",
            }}
          />
          <button
            onClick={() => { onMute(!muted); }}
            style={{ ...tB(t), width: 26, height: 26, borderRadius: 6, color: muted ? R : t.mt, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {muted ? <VolMuteI s={11} /> : <VolumeI s={11} />}
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════ MAIN SETTINGS MODAL ═══════ */
export default function SettingsModal({
  open, onClose, t, T,
  /* Profile */
  userName, setUserName, userRole, setUserRole, lang, setLang, dk, setDk,
  /* Timer */
  autoAdvance, setAutoAdvance, includeBreaks, setIncludeBreaks,
  muted, setMuted, volume, setVolume,
  tickEnabled, setTickEnabled,
  /* Storage */
  storageMode, fsFolderName, onPickFolder, onExport, onImport, fsSupported,
  /* AI */
  hasApiKey, onSetApiKey, onClearApiKey, transcriptionLang, setTranscriptionLang,
  /* Notifications */
  onRequestNotifPerm,
  /* Data */
  trashCount, onEmptyTrash, onResetOnboarding, onClearAllData,
  /* misc */
  notify, roles,
}) {
  const [tab, setTab] = useState("profile");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [clearConfirm, setClearConfirm] = useState(false);

  if (!open) return null;

  const inputSt = {
    height: 36, borderRadius: 8, border: `1.5px solid ${t.bd}`, background: t.inp,
    color: t.fg, padding: "0 12px", fontFamily: sf, fontSize: 13, width: "100%",
  };
  const selectSt = {
    ...inputSt, cursor: "pointer", appearance: "auto",
  };
  const dangerBtn = {
    height: 32, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${R}40`,
    background: `${R}10`, color: R, cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600,
  };
  const secBtn = {
    height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${t.bd}`,
    background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 12,
    display: "flex", alignItems: "center", gap: 6,
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100, background: t.ov, backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{
        background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 18, width: "100%",
        maxWidth: 580, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${t.bd}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GearI s={16} c={t.mt} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{T("settings")}</h3>
          </div>
          <button onClick={onClose} style={{ ...sB(t), width: 28, height: 28 }}><XI s={12} /></button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: "flex", gap: 2, padding: "8px 16px", borderBottom: `1px solid ${t.bd}`,
          overflowX: "auto", flexShrink: 0,
        }}>
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{
              height: 32, padding: "0 12px", borderRadius: 8, border: "none",
              background: tab === tb.key ? `${R}15` : "transparent",
              color: tab === tb.key ? R : t.mt, cursor: "pointer",
              fontFamily: sf, fontSize: 11, fontWeight: tab === tb.key ? 600 : 400,
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 13 }}>{tb.ic}</span> {T(tb.lk)}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>

          {/* ━━━ PROFILE ━━━ */}
          {tab === "profile" && (
            <div>
              <Row label={T("settingsName")} t={t}>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} style={{ ...inputSt, maxWidth: 200 }} />
              </Row>
              <Row label={T("settingsRole")} t={t}>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={{ ...selectSt, maxWidth: 200 }}>
                  <option value="">–</option>
                  {(roles || []).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Row>
              <Row label={T("settingsLanguage")} t={t}>
                <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ ...selectSt, maxWidth: 160 }}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </Row>
              <Row label={T("settingsTheme")} t={t}>
                <button onClick={() => setDk(!dk)} style={{
                  width: 46, height: 24, borderRadius: 12, border: `1.5px solid ${t.bd}`, background: t.inp,
                  cursor: "pointer", position: "relative", padding: 0,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: t.fg,
                    position: "absolute", top: 1.5, left: dk ? 24 : 1.5,
                    transition: "left .3s cubic-bezier(.4,0,.2,1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 9 }}>{dk ? "🌙" : "☀️"}</span>
                  </div>
                </button>
                <span style={{ fontSize: 11, color: t.mt, fontFamily: sf }}>{dk ? T("settingsThemeDark") : T("settingsThemeLight")}</span>
              </Row>
            </div>
          )}

          {/* ━━━ TIMER ━━━ */}
          {tab === "timer" && (
            <div>
              <Row label={T("settingsAutoAdvance")} desc={T("settingsAutoAdvanceDesc")} t={t}>
                <Toggle on={autoAdvance} onChange={setAutoAdvance} color={G} />
              </Row>
              <Row label={T("settingsIncludeBreaks")} desc={T("settingsIncludeBreaksDesc")} t={t}>
                <Toggle on={includeBreaks} onChange={setIncludeBreaks} color={B} />
              </Row>
              <Row label={T("settingsSoundOnEnd")} t={t}>
                <Toggle on={!muted} onChange={(v) => setMuted(!v)} color={G} />
              </Row>
              <Row label={T("settingsTickSound")} desc={T("settingsTickSoundDesc")} t={t}>
                <Toggle on={tickEnabled} onChange={setTickEnabled} color={G} />
              </Row>
              <Row label={T("settingsVolume")} t={t}>
                <VolumePopover muted={muted} volume={volume} onMute={setMuted} onVolume={setVolume} t={t} />
              </Row>
              <Row label={T("settingsEndAction")} t={t}>
                <select value={autoAdvance ? "next" : "stop"} onChange={(e) => setAutoAdvance(e.target.value === "next")} style={{ ...selectSt, maxWidth: 180 }}>
                  <option value="stop">{T("endStop")}</option>
                  <option value="next">{T("endNext")}</option>
                </select>
              </Row>
            </div>
          )}

          {/* ━━━ STORAGE ━━━ */}
          {tab === "storage" && (
            <div>
              <Row label={T("settingsStorageMode")} t={t}>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => {}} style={{
                    ...secBtn, background: storageMode === "session" ? `${B}15` : "transparent",
                    border: `1.5px solid ${storageMode === "session" ? B : t.bd}`,
                    color: storageMode === "session" ? B : t.mt, fontSize: 11,
                  }}>💾 {T("settingsBrowserOnly")}</button>
                  {fsSupported && <button onClick={onPickFolder} style={{
                    ...secBtn, background: storageMode === "disk" ? `${G}15` : "transparent",
                    border: `1.5px solid ${storageMode === "disk" ? G : t.bd}`,
                    color: storageMode === "disk" ? G : t.mt, fontSize: 11,
                  }}>📁 {T("settingsFilesystem")}</button>}
                </div>
              </Row>
              {storageMode === "disk" && (
                <Row label={T("settingsFsFolder")} t={t}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: G, fontFamily: sf }}>{fsFolderName || T("settingsFsNone")}</span>
                    <button onClick={onPickFolder} style={{ ...secBtn, height: 28, padding: "0 10px" }}>
                      <FolderOpenI s={10} /> {T("settingsChooseFolder")}
                    </button>
                  </div>
                </Row>
              )}
              <Row label={T("settingsAutosave")} desc={T("settingsAutosaveDesc")} t={t}>
                <Toggle on={true} disabled color={G} />
              </Row>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={onExport} style={secBtn}><ExportI s={12} /> {T("settingsExport")}</button>
                <button onClick={onImport} style={secBtn}><ImportI s={12} /> {T("settingsImport")}</button>
              </div>
            </div>
          )}

          {/* ━━━ AI ━━━ */}
          {tab === "ai" && (
            <div>
              <Row label={T("settingsApiKey")} desc={hasApiKey ? T("settingsApiKeySet") : T("settingsApiKeyNone")} t={t}>
                {hasApiKey ? (
                  <button onClick={onClearApiKey} style={dangerBtn}>{T("clearApiKey")}</button>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={T("settingsApiKeyPlaceholder")}
                      type="password"
                      style={{ ...inputSt, maxWidth: 180 }}
                    />
                    <button onClick={() => { if (apiKeyInput.trim()) { onSetApiKey(apiKeyInput.trim()); setApiKeyInput(""); } }} style={{
                      height: 36, padding: "0 14px", borderRadius: 8, border: "none",
                      background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600,
                    }}>OK</button>
                  </div>
                )}
              </Row>
              <Row label={T("settingsModel")} t={t}>
                <span style={{ fontSize: 12, fontFamily: sf, color: t.mt, padding: "4px 10px", borderRadius: 6, background: t.inp, border: `1px solid ${t.bd}` }}>llama-3.3-70b-versatile</span>
              </Row>
              <Row label={T("settingsTranscriptionLang")} t={t}>
                <select value={transcriptionLang} onChange={(e) => setTranscriptionLang(e.target.value)} style={{ ...selectSt, maxWidth: 180 }}>
                  <option value="auto">{T("settingsLangAuto")}</option>
                  <option value="en">{T("settingsLangEn")}</option>
                  <option value="es">{T("settingsLangEs")}</option>
                </select>
              </Row>
            </div>
          )}

          {/* ━━━ NOTIFICATIONS ━━━ */}
          {tab === "notifications" && (
            <div>
              <Row label={T("settingsBrowserNotifs")} desc={T("settingsBrowserNotifsDesc")} t={t}>
                <button onClick={onRequestNotifPerm} style={{
                  ...secBtn,
                  color: typeof Notification !== "undefined" && Notification.permission === "granted" ? G : t.mt,
                  border: `1.5px solid ${typeof Notification !== "undefined" && Notification.permission === "granted" ? G : t.bd}`,
                }}>
                  <BellI s={11} />
                  {typeof Notification !== "undefined" && Notification.permission === "granted" ? "✓ " + T("active") : T("enableNotifications")}
                </button>
              </Row>
              <Row label={T("settingsSoundNotifs")} desc={T("settingsSoundNotifsDesc")} t={t}>
                <Toggle on={!muted} onChange={(v) => setMuted(!v)} color={G} />
              </Row>
              <Row label={T("settingsVolume")} t={t}>
                <VolumePopover muted={muted} volume={volume} onMute={setMuted} onVolume={setVolume} t={t} />
              </Row>
              <Row label={T("settingsDefaultReminder")} t={t}>
                <select defaultValue="none" style={{ ...selectSt, maxWidth: 180 }}>
                  <option value="none">{T("settingsReminderNone")}</option>
                  <option value="5">{T("settingsReminder5")}</option>
                  <option value="10">{T("settingsReminder10")}</option>
                  <option value="15">{T("settingsReminder15")}</option>
                </select>
              </Row>
            </div>
          )}

          {/* ━━━ DATA ━━━ */}
          {tab === "data" && (
            <div>
              <Row label={T("settingsEmptyTrash")} desc={trashCount > 0 ? `${trashCount} ${T("settingsTrashCount")}` : T("settingsTrashEmpty")} t={t}>
                <button onClick={onEmptyTrash} disabled={trashCount === 0} style={{
                  ...dangerBtn, opacity: trashCount === 0 ? 0.4 : 1,
                  cursor: trashCount === 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Trash s={11} /> {T("settingsEmptyTrash")}
                </button>
              </Row>
              <Row label={T("settingsResetOnboarding")} desc={T("settingsResetOnboardingDesc")} t={t}>
                <button onClick={() => { onResetOnboarding(); onClose(); }} style={secBtn}>
                  {T("settingsResetOnboarding")}
                </button>
              </Row>
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: `1.5px solid ${R}30`, background: `${R}06` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: R, marginBottom: 4 }}>⚠️ {T("settingsClearData")}</div>
                <div style={{ fontSize: 11, color: t.mt, marginBottom: 12, lineHeight: 1.5 }}>{T("settingsClearDataDesc")}</div>
                {!clearConfirm ? (
                  <button onClick={() => setClearConfirm(true)} style={dangerBtn}>
                    {T("settingsClearData")}
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: R, fontWeight: 500 }}>{T("settingsClearConfirm")}</span>
                    <button onClick={() => { onClearAllData(); onClose(); }} style={{
                      ...dangerBtn, background: R, color: "#fff", border: "none",
                    }}>
                      {T("settingsClearData")}
                    </button>
                    <button onClick={() => setClearConfirm(false)} style={{ ...secBtn, height: 32 }}>
                      {T("cancel")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
