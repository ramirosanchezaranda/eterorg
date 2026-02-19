import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevR, CalI, Plus, XI, PlayI, Trash, Grip } from "../icons";
import { sB, tB } from "../ui/styles";
import { PRIOS, STC } from "../../constants";
import { G, R, B, Y, sf } from "../../constants/theme";
import { today, fmtDur, nowAR_HM, fmt } from "../../utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const AR_TZ = "America/Argentina/Buenos_Aires";
const HOUR_H = 64; /* px height per hour row in day view */

/* Get current hour & minute in Argentina */
const arNow = () => {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: AR_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const [hh, mm] = f.format(new Date()).split(":");
  return { h: parseInt(hh, 10), m: parseInt(mm, 10) };
};

export default function CalendarView({ tasks, onCreateTask, onSchedule, onUnschedule, onRemoveTask, play, pause, markDone, t, T }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDay, setSelectedDay] = useState(null);
  /* responsive */
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 640); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const hourH = isMobile ? 52 : HOUR_H;
  /* Inline create form state */
  const [createAt, setCreateAt] = useState(null); // { hour }
  const [cName, setCName] = useState("");
  const [cMin, setCMin] = useState(25);
  const [cSec, setCSec] = useState(0);
  const [cPrio, setCPrio] = useState("P2");
  const [cHour, setCHour] = useState(0);
  const [cMinute, setCMinute] = useState(0);
  /* Drag-and-drop rescheduling */
  const [dragTaskId, setDragTaskId] = useState(null);
  /* AR clock */
  const [arTime, setArTime] = useState(arNow);
  useEffect(() => { const iv = setInterval(() => setArTime(arNow()), 30000); return () => clearInterval(iv); }, []);

  const days = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const last = new Date(month.y, month.m + 1, 0);
    const startDay = first.getDay();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(d);
    return cells;
  }, [month]);

  const prevM = () => setMonth((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }));
  const nextM = () => setMonth((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }));
  const isEs = T("calendar") === "Calendario";
  const mName = new Date(month.y, month.m).toLocaleString(isEs ? "es-ES" : "en-US", { month: "long", year: "numeric" });
  const todayStr = today();

  const dayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return tasks.filter((tk) => tk.dueDate === selectedDay);
  }, [selectedDay, tasks]);

  const byHour = useMemo(() => {
    const map = {};
    dayTasks.filter((tk) => tk.dueTime).forEach((tk) => {
      const h = parseInt(tk.dueTime.split(":")[0], 10);
      if (!map[h]) map[h] = [];
      map[h].push(tk);
    });
    return map;
  }, [dayTasks]);

  /* Compute positioned blocks for the timeline overlay */
  const timeBlocks = useMemo(() => {
    return dayTasks.filter((tk) => tk.dueTime).map((tk) => {
      const [hh, mm] = tk.dueTime.split(":").map(Number);
      const startMin = hh * 60 + (mm || 0);
      const durMin = Math.max(5, (tk.totalSeconds || tk.minutes * 60) / 60); // min 5 min visual
      return { ...tk, startMin, durMin };
    });
  }, [dayTasks]);

  const unscheduled = useMemo(() => dayTasks.filter((tk) => !tk.dueTime), [dayTasks]);

  const fmtHour = useCallback((h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:00 ${suffix}`;
  }, []);

  const selectedDayName = useMemo(() => {
    if (!selectedDay) return "";
    const d = new Date(selectedDay + "T12:00:00");
    return d.toLocaleDateString(isEs ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric" });
  }, [selectedDay, isEs]);

  const handleDayClick = (dateStr) => { setSelectedDay(dateStr); setCreateAt(null); };
  const handleHourClick = (hour) => { if (selectedDay) { setCreateAt({ hour }); setCName(""); setCMin(25); setCSec(0); setCPrio("P2"); setCHour(hour); setCMinute(0); } };

  const fmtTime = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const fmtTime12 = (h, m) => { const s = h >= 12 ? "PM" : "AM"; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, "0")} ${s}`; };

  const handleCreate = () => {
    if (!cName.trim() || (cMin <= 0 && cSec <= 0) || !createAt) return;
    const timeStr = fmtTime(cHour, cMinute);
    onCreateTask(cName.trim(), cMin, cPrio, selectedDay, timeStr, cSec);
    setCreateAt(null);
    setCName("");
    setCMin(25);
    setCSec(0);
    setCPrio("P2");
  };

  /* ═══ MONTH VIEW ═══ */
  if (!selectedDay) {
    return (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>{T("calendar")}</h2>
            <div style={{ fontSize: 10, color: t.mt, fontFamily: sf, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
              🇦🇷 {T("arTimezone")}: {nowAR_HM()}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={prevM} style={sB(t)}><ChevR s={14} style={{ transform: "rotate(180deg)" }} /></button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: "center", textTransform: "capitalize" }}>{mName}</span>
            <button onClick={nextM} style={sB(t)}><ChevR s={14} /></button>
          </div>
        </div>
        <div className="calendar-grid">
          {[T("sun"), T("mon"), T("tue"), T("wed"), T("thu"), T("fri"), T("sat")].map((d) => (
            <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 10, fontFamily: sf, color: t.mt, letterSpacing: "0.1em", textTransform: "uppercase" }}>{d}</div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const dateStr = `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const dTasks = tasks.filter((tk) => tk.dueDate === dateStr);
            const hasScheduled = dTasks.some((tk) => tk.dueTime);
            return (
              <div key={i} onClick={() => handleDayClick(dateStr)} className="calendar-cell"
                style={{ padding: 6, border: `1px solid ${t.bd}`, borderRadius: 8, background: isToday ? `${B}06` : t.card, position: "relative", cursor: "pointer", transition: "all .12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.hv; e.currentTarget.style.borderColor = `${B}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isToday ? `${B}06` : t.card; e.currentTarget.style.borderColor = t.bd; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? B : t.fg, ...(isToday ? { background: `${B}15`, borderRadius: 6, padding: "1px 5px" } : {}) }}>{d}</div>
                  {hasScheduled && <div style={{ width: 5, height: 5, borderRadius: "50%", background: B }} />}
                </div>
                {dTasks.slice(0, 3).map((tk) => (
                  <div key={tk.id} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2, background: `${STC[tk.status || "todo"]}18`, color: STC[tk.status || "todo"], fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tk.name}>
                    {tk.dueTime && <span style={{ fontSize: 8, opacity: 0.7, marginRight: 3 }}>{tk.dueTime}</span>}
                    {tk.name}
                  </div>
                ))}
                {dTasks.length > 3 && <div style={{ fontSize: 9, color: t.mt, fontFamily: sf }}>+{dTasks.length - 3} {T("more")}</div>}
              </div>
            );
          })}
        </div>
        {tasks.filter((tk) => tk.dueDate).length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 32 }}>
            <div className="glass-bar" style={{ textAlign: "center", padding: "32px 40px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 340 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><CalI s={22} c={t.mt} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 5, letterSpacing: "-0.02em" }}>{T("calendarEmpty")}</div>
              <div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 8 }}>{T("calendarEmptyDesc")}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══ DAY VIEW ═══ */
  const handleDropOnHour = (h) => {
    if (!dragTaskId || !selectedDay) return;
    const timeStr = fmtTime(h, 0);
    onSchedule(dragTaskId, selectedDay, timeStr);
    setDragTaskId(null);
  };

  return (
    <div className="fi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setSelectedDay(null); setCreateAt(null); }} className="glass-btn" style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glass, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.mt }}>
            <ChevR s={14} style={{ transform: "rotate(180deg)" }} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", textTransform: "capitalize", margin: 0, lineHeight: 1.2 }}>{selectedDayName}</h2>
            <div style={{ fontSize: 10, color: t.mt, fontFamily: sf, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
              {T("dragToSchedule")}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>🇦🇷 {nowAR_HM()}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Timeline with duration blocks */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {/* Hour grid rows */}
          {HOURS.map((h) => {
            const isNowHour = selectedDay === todayStr && h === arTime.h;
            const isCreating = createAt && createAt.hour === h;
            return (
              <div key={h}>
                <div
                  onClick={() => !isCreating && handleHourClick(h)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = `${B}08`; }}
                  onDragLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = "transparent"; handleDropOnHour(h); }}
                  style={{ display: "flex", minHeight: hourH, borderBottom: `1px solid ${t.bd}`, cursor: isCreating ? "default" : "pointer", position: "relative", transition: "background .1s" }}
                  onMouseEnter={(e) => { if (!isCreating) e.currentTarget.style.background = t.hv; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: isMobile ? 44 : 64, flexShrink: 0, padding: isMobile ? "6px 4px 6px 0" : "8px 10px 8px 0", textAlign: "right", fontSize: isMobile ? 9 : 11, fontFamily: sf, color: isNowHour ? B : t.mt, fontWeight: isNowHour ? 700 : 400 }}>
                    {fmtHour(h)}
                  </div>
                  {isNowHour && (
                    <div style={{ position: "absolute", left: isMobile ? 40 : 60, right: 0, top: `${(arTime.m / 60) * 100}%`, height: 2, background: B, zIndex: 5, borderRadius: 1 }}>
                      <div style={{ position: "absolute", left: -4, top: -3, width: 8, height: 8, borderRadius: "50%", background: B }} />
                    </div>
                  )}
                  <div style={{ flex: 1, padding: "6px 0 6px 10px", borderLeft: `2px solid ${isNowHour ? B : t.bd}`, position: "relative" }}>
                    {/* Duration blocks for tasks starting this hour */}
                    {timeBlocks.filter((b) => Math.floor(b.startMin / 60) === h).map((blk) => {
                      const pr = PRIOS.find((p) => p.k === blk.priority) || PRIOS[2];
                      const startOffset = (blk.startMin % 60) / 60; // fraction within the hour
                      const durHours = blk.durMin / 60;
                      const blockH = Math.max(28, durHours * hourH); // min 28px height
                      return (
                        <div
                          key={blk.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); setDragTaskId(blk.id); }}
                          onDragEnd={() => setDragTaskId(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="glass-bar"
                          style={{
                            position: "absolute",
                            top: startOffset * hourH,
                            left: 4,
                            right: 8,
                            height: blockH,
                            borderRadius: 10,
                            background: `${pr.c}12`,
                            border: `1px solid ${pr.c}30`,
                            padding: "6px 10px",
                            cursor: "grab",
                            zIndex: 3,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            transition: "box-shadow .15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 2px 12px ${pr.c}25`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 4, height: Math.min(28, blockH - 12), borderRadius: 2, background: pr.c, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: sf, color: t.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {blk.name}
                              </div>
                              {blockH >= 40 && (
                                <div style={{ fontSize: 10, color: t.mt, fontFamily: sf, display: "flex", alignItems: "center", gap: 4 }}>
                                  {blk.dueTime} · {fmtDur(blk.totalSeconds || blk.minutes * 60)}
                                  {blk.remaining !== undefined && blk.remaining < (blk.totalSeconds || blk.minutes * 60) && (
                                    <span style={{ color: blk.running ? Y : blk.done ? G : t.mt }}>({fmt(blk.remaining)})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                              {!blk.done && !blk.running && <button onClick={(e) => { e.stopPropagation(); play(blk.id); }} style={{ ...tB(t), width: 22, height: 22, borderRadius: 5, background: `${G}18`, color: G }} title={T("play")}><PlayI s={9} /></button>}
                              {blk.running && <button onClick={(e) => { e.stopPropagation(); pause(blk.id); }} style={{ ...tB(t), width: 22, height: 22, borderRadius: 5, background: `${Y}18`, color: Y }} title={T("pause")}>❚</button>}
                              {!blk.done && <button onClick={(e) => { e.stopPropagation(); markDone(blk.id); }} style={{ ...tB(t), width: 22, height: 22, borderRadius: 5, background: `${G}18`, color: G }} title={T("done")}>✓</button>}
                              <button onClick={(e) => { e.stopPropagation(); onUnschedule(blk.id); }} style={{ ...tB(t), width: 20, height: 20, borderRadius: 5 }} title={T("unschedule")}>
                                <XI s={8} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* "+" hint when no blocks this hour */}
                    {!timeBlocks.some((b) => Math.floor(b.startMin / 60) === h) && !isCreating && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0, paddingTop: 4 }} className="hour-plus">
                        <Plus s={10} c={t.mt} /><span style={{ fontSize: 10, color: t.mt, fontFamily: sf }}>{T("createInCalendar")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline create form */}
                {isCreating && (
                  <div onClick={(e) => e.stopPropagation()} style={{ margin: `0 0 0 ${isMobile ? 44 : 64}px`, padding: isMobile ? "10px 10px" : "12px 14px", borderRadius: 12, background: t.card, border: `1.5px solid ${B}40`, borderLeft: `3px solid ${B}`, marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: sf, color: B, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Plus s={10} c={B} /> {T("createInCalendar")} — {fmtTime12(cHour, cMinute)}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <input autoFocus value={cName} onChange={(e) => setCName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder={T("taskName")} style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 10px", fontFamily: sf, fontSize: 12 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                      {/* ── Time picker (hour:minute) ── */}
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 9, color: t.mt, fontFamily: sf, marginRight: 2 }}>⏰</span>
                        <select value={cHour} onChange={(e) => setCHour(parseInt(e.target.value))} style={{ width: 52, height: 30, borderRadius: "7px 0 0 7px", border: `1px solid ${B}40`, background: `${B}08`, color: t.fg, fontFamily: sf, fontSize: 12, textAlign: "center", cursor: "pointer" }}>
                          {HOURS.map((hr) => <option key={hr} value={hr}>{String(hr).padStart(2, "0")}</option>)}
                        </select>
                        <span style={{ height: 30, display: "flex", alignItems: "center", background: `${B}08`, color: B, fontSize: 12, fontWeight: 700, fontFamily: sf, borderTop: `1px solid ${B}40`, borderBottom: `1px solid ${B}40`, padding: "0 2px" }}>:</span>
                        <select value={cMinute} onChange={(e) => setCMinute(parseInt(e.target.value))} style={{ width: 52, height: 30, borderRadius: "0 7px 7px 0", border: `1px solid ${B}40`, background: `${B}08`, color: t.fg, fontFamily: sf, fontSize: 12, textAlign: "center", cursor: "pointer" }}>
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                        </select>
                        <span style={{ fontSize: 9, color: B, fontFamily: sf, marginLeft: 4, fontWeight: 600 }}>{T("calTime")}</span>
                      </div>
                      <div style={{ width: 1, height: 20, background: t.bd, margin: "0 2px" }} />
                      {/* ── Duration (min:sec) ── */}
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <input type="number" min={0} value={cMin} onChange={(e) => setCMin(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 42, height: 30, borderRadius: "7px 0 0 7px", border: `1px solid ${t.bd}`, borderRight: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 12, textAlign: "center" }} />
                        <span style={{ height: 30, display: "flex", alignItems: "center", background: t.inp, color: t.mt, fontSize: 8, fontFamily: sf, borderTop: `1px solid ${t.bd}`, borderBottom: `1px solid ${t.bd}`, padding: "0 1px" }}>:</span>
                        <input type="number" min={0} max={59} value={cSec} onChange={(e) => setCSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 42, height: 30, borderRadius: "0 7px 7px 0", border: `1px solid ${t.bd}`, borderLeft: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 12, textAlign: "center" }} />
                        <span style={{ fontSize: 9, color: t.mt, fontFamily: sf, marginLeft: 4 }}>{T("calMin")}:{T("calSec")}</span>
                      </div>
                      <select value={cPrio} onChange={(e) => setCPrio(e.target.value)} style={{ height: 30, borderRadius: 7, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 6px" }}>
                        {PRIOS.map((p) => <option key={p.k} value={p.k}>{p.k}</option>)}
                      </select>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        <button onClick={handleCreate} disabled={!cName.trim() || (cMin <= 0 && cSec <= 0)} style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "none", background: !cName.trim() || (cMin <= 0 && cSec <= 0) ? `${G}40` : G, color: "#fff", cursor: !cName.trim() || (cMin <= 0 && cSec <= 0) ? "not-allowed" : "pointer", fontFamily: sf, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Plus s={9} /> {T("calCreate")}
                        </button>
                        <button onClick={() => setCreateAt(null)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: t.mt, fontFamily: sf, opacity: 0.7 }}>
                      ⏰ {T("visibleAtTime")} {fmtTime12(cHour, cMinute)} (🇦🇷 {T("arTimezone")})
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar — unscheduled tasks for this day, draggable */}
        {!isMobile && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: sf, color: t.mt, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              {T("scheduledTasks")} ({dayTasks.filter(tk => tk.dueTime).length})
            </div>
            {unscheduled.length > 0 && (
              <>
                <div style={{ fontSize: 9, color: t.mt, fontFamily: sf, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{T("noTasksThisDay").includes("No") ? "Sin hora asignada" : "Unscheduled"}</div>
                {unscheduled.map((tk) => {
                  const pr = PRIOS.find((p) => p.k === tk.priority) || PRIOS[2];
                  return (
                    <div
                      key={tk.id}
                      draggable
                      onDragStart={() => setDragTaskId(tk.id)}
                      onDragEnd={() => setDragTaskId(null)}
                      className="glass-bar"
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: t.glass, border: `1px solid ${t.glassBd}`, marginBottom: 4, cursor: "grab" }}
                    >
                      <Grip s={10} c={t.mt} />
                      <div style={{ width: 4, height: 20, borderRadius: 2, background: pr.c, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, fontFamily: sf, color: t.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.name}</div>
                        <div style={{ fontSize: 9, color: t.mt, fontFamily: sf }}>{fmtDur(tk.totalSeconds || tk.minutes * 60)}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {dayTasks.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", borderRadius: 12, border: `1px dashed ${t.bd}`, color: t.mt }}>
                <div style={{ fontSize: 12, fontFamily: sf, marginBottom: 4 }}>{T("noTasksThisDay")}</div>
                <div style={{ fontSize: 10, fontFamily: sf, color: t.mt, opacity: 0.7 }}>{T("dragToSchedule")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`.hour-plus{transition:opacity .15s}div:hover>.hour-plus{opacity:1!important}`}</style>
    </div>
  );
}
