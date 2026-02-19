import { useState } from "react";
import { XI } from "../icons";
import { sB } from "../ui/styles";
import { PRIOS } from "../../constants";
import { G, R, sf } from "../../constants/theme";

export default function TimerEditModal({ task, onSave, onClose, t, T }) {
  const [name, setName] = useState(task.name);
  const [minutes, setMinutes] = useState(task.minutes);
  const [seconds, setSeconds] = useState(task.seconds || 0);
  const [priority, setPriority] = useState(task.priority || "P2");
  const [tags, setTags] = useState((task.tags || []).join(", "));
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [endAction, setEndAction] = useState(task.endAction || "stop");
  const [soundOnEnd, setSoundOnEnd] = useState(task.soundOnEnd !== false);

  const handleSave = () => {
    const totalSec = minutes * 60 + seconds;
    onSave(task.id, {
      name: name.trim() || task.name,
      minutes,
      seconds,
      totalSeconds: totalSec,
      remaining: task.done ? 0 : totalSec,
      priority,
      tags: tags ? tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      assignee,
      dueDate,
      endAction,
      soundOnEnd,
    });
    onClose();
  };

  const inp = { height: 36, borderRadius: 8, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 12px", fontFamily: sf, fontSize: 13, width: "100%" };
  const lbl = { fontSize: 10, fontWeight: 600, color: t.mt, fontFamily: sf, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: t.ov, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.bd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: sf }}>{T("timerSettings")}</h3>
          <button onClick={onClose} style={{ ...sB(t), width: 28, height: 28 }}><XI s={12} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Name */}
          <div>
            <div style={lbl}>{T("timerName")}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
          </div>
          {/* Duration */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={lbl}>{T("timerMinutes")}</div>
              <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={lbl}>{T("timerSeconds")}</div>
              <input type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={inp} />
            </div>
          </div>
          {/* Priority */}
          <div>
            <div style={lbl}>{T("timerPriority")}</div>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {PRIOS.map((p) => <option key={p.k} value={p.k}>{T(p.lk)}</option>)}
            </select>
          </div>
          {/* Tags */}
          <div>
            <div style={lbl}>{T("timerTags")}</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" style={inp} />
          </div>
          {/* Assignee & Due */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={lbl}>{T("assignee")}</div>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={lbl}>{T("timerDue")}</div>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inp} />
            </div>
          </div>
          {/* End action */}
          <div>
            <div style={lbl}>{T("endAction")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["stop", "next", "repeat"].map((a) => (
                <button key={a} onClick={() => setEndAction(a)} style={{
                  flex: 1, height: 34, borderRadius: 8, border: endAction === a ? `2px solid ${R}` : `1px solid ${t.bd}`,
                  background: endAction === a ? `${R}12` : "transparent", color: endAction === a ? t.fg : t.mt,
                  cursor: "pointer", fontFamily: sf, fontSize: 11, fontWeight: 500,
                }}>{T(a === "stop" ? "endStop" : a === "next" ? "endNext" : "endRepeat")}</button>
              ))}
            </div>
          </div>
          {/* Sound toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontFamily: sf, color: t.fg }}>{T("soundOnEnd")}</span>
            <button onClick={() => setSoundOnEnd(!soundOnEnd)} style={{
              width: 40, height: 22, borderRadius: 11, border: `1.5px solid ${t.bd}`,
              background: soundOnEnd ? G : t.inp, cursor: "pointer", position: "relative", padding: 0,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: soundOnEnd ? "#fff" : t.mt, position: "absolute", top: 1.5, left: soundOnEnd ? 20 : 1.5, transition: "left .2s" }} />
            </button>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.bd}`, display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12 }}>{T("cancel")}</button>
          <button onClick={handleSave} style={{ flex: 1, height: 36, borderRadius: 8, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600 }}>{T("saveChanges")}</button>
        </div>
      </div>
    </div>
  );
}
