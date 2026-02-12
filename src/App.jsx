import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ── Theme & Constants ── */
import { mkT, R, G, Y, B, O, sf, sm } from "./constants/theme";
import { PRIOS, TC, STS, STL_KEYS, STC, ICONS, COVERS, TMPLS } from "./constants";
import { useT } from "./i18n";
import { uid, fmt, fmtDur, now, today, todayAR, nowAR_HM, downloadFile } from "./utils";

/* ── Icons ── */
import {
  Plus, Trash, FileT, Fold, PlayI, TimerI, SideI, MoonI, SunI, ResetI,
  Sparkle, LinkI, XI, ArrowR, SearchI, Star, Board, TableI, HistI,
  CalI, GallI, UpI, CopyI, DlI, FilterI, BellI, HelpI, KeyI,
} from "./components/icons";

/* ── UI primitives ── */
import { tB, sB, pill } from "./components/ui/styles";
import Ring from "./components/ui/Ring";
import Toasts from "./components/ui/Toasts";
import FilterBar from "./components/ui/FilterBar";
import SubTaskInput from "./components/ui/SubTaskInput";

/* ── Markdown ── */
import useMd from "./hooks/useMd";

/* ── Modals ── */
import SearchModal from "./components/modals/SearchModal";
import TaskPreview from "./components/modals/TaskPreview";
import TrashModal from "./components/modals/TrashModal";
import SlashMenu from "./components/modals/SlashMenu";
import HelpModal from "./components/modals/HelpModal";
import AiSetupModal from "./components/modals/AiSetupModal";
import AiWriteModal from "./components/modals/AiWriteModal";

/* ── Views ── */
import CalendarView from "./components/views/CalendarView";
import GalleryView from "./components/views/GalleryView";
import DocTree from "./components/views/DocTree";

/* ── Services ── */
import { genTasks, genContent, setGroqKey, getGroqKey } from "./services/ai";
import { db } from "./services/db";

/* ═══════════════════════════════════════════════════
   ██████  MAIN APP  ██████
   ═══════════════════════════════════════════════════ */
export default function App() {
  const [dk, setDk] = useState(true);
  const t = mkT(dk);
  const [lang, setLang] = useState("en");
  const T = useT(lang);
  const STL = useMemo(() => ({ todo: T("toDo"), progress: T("inProgress"), done: T("done") }), [T]);
  const [sbMode, setSbMode] = useState(() => window.innerWidth > 768 ? "open" : "closed");
  const isMini = sbMode === "mini";
  const sbW = sbMode === "open" ? 256 : sbMode === "mini" ? 52 : 0;
  const toggleSb = () => setSbMode((m) => m === "open" ? (window.innerWidth <= 768 ? "closed" : "mini") : "open");
  const [view, setView] = useState("timers");
  const [searchOpen, setSearchOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  /* ONBOARDING */
  const [onboarded, setOnboarded] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [onboardStep, setOBS] = useState(0);
  const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? T("goodMorning") : h < 18 ? T("goodAfternoon") : T("goodEvening"); }, [T]);

  /* NOTIFICATIONS */
  const [notifs, setNotifs] = useState([]);
  const notify = (text, icon = "🔔") => {
    const id = uid();
    setNotifs((p) => [...p, { id, text, icon }]);
    setTimeout(() => setNotifs((p) => p.filter((n) => n.id !== id)), 4000);
    /* browser notification */
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("eterOrg", { body: text, icon: "/favicon.svg" }); } catch (_) {}
    }
  };
  const requestNotifPerm = () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") { notify(T("notificationsEnabled"), "✅"); return; }
    if (Notification.permission === "denied") { notify(T("notificationsDenied"), "🚫"); return; }
    Notification.requestPermission().then((p) => {
      if (p === "granted") notify(T("notificationsEnabled"), "✅");
      else notify(T("notificationsDenied"), "🚫");
    });
  };

  /* TRASH */
  const [trash, setTrash] = useState([]);
  const toTrash = (item, type) => { setTrash((p) => [{ ...item, itemType: type, deletedAt: now() }, ...p]); if (type === "task") db.deleteTask(item.id); else db.deleteDoc(item.id); };
  const restoreTrash = (i) => { const item = trash[i]; setTrash((p) => p.filter((_, j) => j !== i)); db.restoreItem(item.id, item.itemType); if (item.itemType === "task") { setTasks((p) => [...p, item]); notify(T("taskRestored"), "♻️"); } else { setDocs((p) => [...p, item]); notify(T("docRestored"), "♻️"); } };
  const permDelete = (i) => { const item = trash[i]; setTrash((p) => p.filter((_, j) => j !== i)); db.permanentDelete(item.id, item.itemType); };

  /* RECENTLY VIEWED */
  const [recent, setRecent] = useState([]);
  const addRecent = (id) => setRecent((p) => { const f = p.filter((x) => x !== id); return [id, ...f].slice(0, 8); });

  /* FILTERS */
  const [filters, setFilters] = useState({ priority: "", status: "", tag: "" });
  const filterTasks = (tasks) => {
    let r = tasks;
    if (filters.priority) r = r.filter((t) => t.priority === filters.priority);
    if (filters.status) r = r.filter((t) => (t.status || "todo") === filters.status);
    if (filters.tag) r = r.filter((t) => (t.tags || []).some((tg) => tg.toLowerCase().includes(filters.tag.toLowerCase())));
    return r;
  };

  /* KEYBOARD */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) { e.preventDefault(); setSearchOpen(true); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "h" || e.key === "H")) { e.preventDefault(); setHelpOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setHelpOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ═══════ TASKS ═══════ */
  const mkTask = (name, min, prio = "P2", tags = [], assignee = "", fromDoc = null, dueDate = "", extraSec = 0) => {
    const totalSec = min * 60 + extraSec;
    return {
      id: uid(), name, minutes: min, seconds: extraSec, totalSeconds: totalSec, remaining: totalSec, running: false, done: false, fromDoc,
      priority: prio, tags, assignee, dueDate, dueTime: "", status: "todo", subtasks: [], relatedDocs: [], reminder: null,
    };
  };
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nN, setNN] = useState(""); const [nM, setNM] = useState(10); const [nS, setNS] = useState(0); const [nP, setNP] = useState("P2");
  const [nT, setNT] = useState(""); const [nA, setNA] = useState(""); const [nD, setND] = useState("");
  const ivs = useRef({});
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  /* ── Sound system (Web Audio API) ── */
  const audioCtxRef = useRef(null);

  /* Initialize AudioContext on first user interaction (autoplay policy) */
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener("click", initAudio, { once: false });
    document.addEventListener("keydown", initAudio, { once: false });
    return () => { document.removeEventListener("click", initAudio); document.removeEventListener("keydown", initAudio); };
  }, []);

  const getAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx.state === "running" ? ctx : null;
    } catch (_) { return null; }
  }, []);

  /* Start sound — ascending two-note chime */
  const playStartSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    [440, 554.37].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, t0 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5 + i * 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0 + i * 0.12);
      osc.stop(t0 + 0.6 + i * 0.12);
    });
  }, [getAudioCtx]);

  /* Tick sound — subtle click each second */
  const playTickSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }, [getAudioCtx]);

  /* Completion sound — loud triumphant chord */
  const playDoneSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, t0 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2 + i * 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0 + i * 0.1);
      osc.stop(t0 + 1.4 + i * 0.1);
    });
  }, [getAudioCtx]);

  const tick = useCallback((id) => {
    setTasks((p) => p.map((x) => {
      if (x.id !== id) return x;
      if (x.remaining <= 1) { clearInterval(ivs.current[id]); delete ivs.current[id]; playDoneSound(); return { ...x, remaining: 0, running: false, done: true, status: "done" }; }
      if (x.reminder && !x.reminder.triggered && x.remaining <= x.reminder.minutes * 60) {
        notify(`⏰ Reminder: ${x.name} — ${x.reminder.minutes}m left`, "⏰");
        playTickSound();
        return { ...x, remaining: x.remaining - 1, reminder: { ...x.reminder, triggered: true } };
      }
      playTickSound();
      return { ...x, remaining: x.remaining - 1 };
    }));
  }, [playTickSound, playDoneSound]);

  const play = (id) => {
    setTasks((p) => {
      const tk = p.find((x) => x.id === id);
      if (tk && !tk.done && !tk.running && !ivs.current[id]) {
        ivs.current[id] = setInterval(() => tick(id), 1000);
        playStartSound();
      }
      return p.map((x) => (x.id === id && !x.done ? { ...x, running: true, status: "progress" } : x));
    });
  };
  const pause = (id) => { clearInterval(ivs.current[id]); delete ivs.current[id]; setTasks((p) => p.map((x) => (x.id === id ? { ...x, running: false } : x))); };
  const markDone = (id) => { clearInterval(ivs.current[id]); delete ivs.current[id]; setTasks((p) => p.map((x) => (x.id === id ? { ...x, running: false, done: true, status: "done" } : x))); playDoneSound(); notify(T("taskCompleted"), "✅"); };
  const resetT = (id) => { clearInterval(ivs.current[id]); delete ivs.current[id]; setTasks((p) => p.map((x) => (x.id === id ? { ...x, remaining: x.totalSeconds || x.minutes * 60, running: false, done: false, status: "todo" } : x))); };
  const removeT = (id) => { clearInterval(ivs.current[id]); delete ivs.current[id]; const tk = tasks.find((x) => x.id === id); if (tk) toTrash(tk, "task"); setTasks((p) => p.filter((x) => x.id !== id)); };
  const chgStatus = (id, s) => { if (s === "done") markDone(id); else if (s === "progress") play(id); else { pause(id); setTasks((p) => p.map((x) => (x.id === id ? { ...x, status: "todo", done: false } : x))); } };
  const addTask = () => { if (!nN.trim()) return; if (nM <= 0 && nS <= 0) return; setTasks((p) => [...p, mkTask(nN.trim(), nM, nP, nT ? nT.split(",").map((s) => s.trim()).filter(Boolean) : [], nA, null, nD, nS)]); setNN(""); setNM(10); setNS(0); setNP("P2"); setNT(""); setNA(""); setND(""); setShowAdd(false); };
  const addSub = (taskId, name) => { if (!name.trim()) return; setTasks((p) => p.map((x) => (x.id === taskId ? { ...x, subtasks: [...x.subtasks, { id: uid(), name: name.trim(), done: false }] } : x))); };
  const toggleSub = (taskId, subId) => setTasks((p) => p.map((x) => (x.id === taskId ? { ...x, subtasks: x.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) } : x)));
  const setReminder = (taskId, min) => setTasks((p) => p.map((x) => (x.id === taskId ? { ...x, reminder: min ? { minutes: min, triggered: false } : null } : x)));
  const [taskDrag, setTaskDrag] = useState(null);
  const reorderT = (from, to) => setTasks((p) => { const a = [...p]; const fi = a.findIndex((x) => x.id === from); const ti = a.findIndex((x) => x.id === to); if (fi < 0 || ti < 0) return p; const [item] = a.splice(fi, 1); a.splice(ti, 0, item); return a; });
  const scheduleTask = (taskId, dateStr, timeStr) => setTasks((p) => p.map((x) => (x.id === taskId ? { ...x, dueDate: dateStr, dueTime: timeStr } : x)));
  const unscheduleTask = (taskId) => setTasks((p) => p.map((x) => (x.id === taskId ? { ...x, dueTime: "" } : x)));
  const createCalTask = (name, min, prio, dateStr, timeStr, extraSec = 0) => {
    const t = mkTask(name, min, prio, [], "", null, dateStr, extraSec);
    t.dueTime = timeStr;
    setTasks((p) => [...p, t]);
  };
  useEffect(() => () => Object.values(ivs.current).forEach(clearInterval), []);

  /* Auto-start scheduled tasks at their designated time (Argentina/Buenos_Aires) */
  useEffect(() => {
    const check = () => {
      const todayStr = todayAR();
      const currentTime = nowAR_HM();
      setTasks((p) => {
        let changed = false;
        const next = p.map((x) => {
          if (x.dueDate === todayStr && x.dueTime && x.dueTime.substring(0, 5) === currentTime && !x.running && !x.done) {
            changed = true;
            if (!ivs.current[x.id]) ivs.current[x.id] = setInterval(() => tick(x.id), 1000);
            playStartSound();
            notify(`▶️ ${T("autoStart")}: ${x.name}`, "⏰");
            return { ...x, running: true, status: "progress" };
          }
          return x;
        });
        return changed ? next : p;
      });
    };
    const iv = setInterval(check, 15000);
    check();
    return () => clearInterval(iv);
  }, [tick]);

  /* ═══════ DOCS ═══════ */
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(false);
  const [favs, setFavs] = useState([]);
  const [drag, setDrag] = useState(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQ, setSlashQ] = useState("");
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });
  const edRef = useRef(null);

  /* UNDO/REDO */
  const [undoStack, setUndo] = useState([]);
  const [redoStack, setRedo] = useState([]);
  const pushUndo = (content) => { setUndo((p) => [...p.slice(-30), content]); setRedo([]); };

  const toggleFav = (id) => setFavs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const findDoc = (ns, id) => { for (const n of ns) { if (n.id === id) return n; if (n.children) { const f = findDoc(n.children, id); if (f) return f; } } return null; };
  const updateDoc = (id, upd) => { const u = (ns) => ns.map((n) => (n.id === id ? { ...n, ...upd } : { ...n, children: n.children ? u(n.children) : n.children })); setDocs(u(docs)); };
  const currentDoc = activeDoc ? findDoc(docs, activeDoc) : null;
  const getBc = useCallback((id) => { const p = []; const s = (ns, tr) => { for (const n of ns) { const t = [...tr, n]; if (n.id === id) { p.push(...t); return true; } if (n.children && s(n.children, t)) return true; } return false; }; s(docs, []); return p; }, [docs]);

  const addRootFolder = () => setDocs([...docs, { id: uid(), name: "New Folder", type: "folder", children: [] }]);
  const addDocTmpl = (tmpl) => { const d = { id: uid(), name: tmpl.n, type: "doc", content: tmpl.c, icon: tmpl.i, cover: null, history: [], relatedTasks: [], createdAt: now() }; setDocs([...docs, d]); setActiveDoc(d.id); setView("docs"); setTemplateOpen(false); notify(T("docCreated"), "📄"); };
  const addBlankDoc = () => { const d = { id: uid(), name: "Untitled", type: "doc", content: "", icon: "📄", cover: null, history: [], relatedTasks: [], createdAt: now() }; setDocs([...docs, d]); setActiveDoc(d.id); setView("docs"); };
  const duplicateDoc = () => { if (!currentDoc) return; const d = { ...JSON.parse(JSON.stringify(currentDoc)), id: uid(), name: `${currentDoc.name} (copy)` }; setDocs([...docs, d]); setActiveDoc(d.id); notify(T("pageDuplicated"), "📋"); };
  const deleteDoc = () => { if (!currentDoc) return; toTrash(currentDoc, "doc"); const f = (ns) => ns.filter((n) => n.id !== currentDoc.id).map((n) => ({ ...n, children: n.children ? f(n.children) : n.children })); setDocs(f(docs)); setActiveDoc(null); notify(T("movedToTrash"), "🗑️"); };
  const exportDoc = () => { if (!currentDoc) return; downloadFile(`${currentDoc.name}.md`, currentDoc.content || ""); notify(T("exportedMd"), "📥"); };
  const importDoc = (file) => { const reader = new FileReader(); reader.onload = (e) => { const d = { id: uid(), name: file.name.replace(/\.md$/, ""), type: "doc", content: e.target.result, icon: "📄", cover: null, history: [], relatedTasks: [], createdAt: now() }; setDocs((p) => [...p, d]); setActiveDoc(d.id); setView("docs"); notify(T("fileImported"), "📤"); }; reader.readAsText(file); };
  const importRef = useRef(null);

  /* AI */
  const [generating, setGen] = useState(false);
  const [aiPreview, setAiP] = useState(null);
  const [aiSetup, setAiSetup] = useState(false);
  const [aiWrite, setAiWrite] = useState({ open: false, mode: "ai" });
  const [aiWriting, setAiWriting] = useState(false);
  const handleGen = async () => {
    if (!currentDoc?.content) return;
    if (!getGroqKey()) { setAiSetup(true); return; }
    setGen(true);
    const r = await genTasks(currentDoc.content, currentDoc.name);
    setGen(false);
    if (r === "NO_KEY") { notify(T("aiNoKey"), "🔑"); return; }
    if (r && Array.isArray(r)) setAiP({ tasks: r.map((r) => ({ ...r, selected: true, priority: r.priority || "P2", tags: r.tags || [] })), docName: currentDoc.name, docId: currentDoc.id });
    else notify(T("aiError"), "⚠️");
  };
  const handleAiKeySave = (key) => { setGroqKey(key); setAiSetup(false); notify(T("apiKeySaved"), "🔑"); };
  const confirmAi = () => { if (!aiPreview) return; const nt = aiPreview.tasks.filter((x) => x.selected).map((s) => mkTask(s.name, s.minutes, s.priority || "P2", s.tags || [], "", aiPreview.docName)); setTasks((p) => [...p, ...nt]); setAiP(null); setView("timers"); notify(`${aiPreview.tasks.filter((x) => x.selected).length} ${T("tasksCreated")}`, "✨"); };

  const saveHistory = () => { if (!currentDoc) return; updateDoc(currentDoc.id, { history: [...(currentDoc.history || []).slice(-19), { date: now(), content: currentDoc.content || "" }] }); };

  const renderMd = useMd(t, docs, (id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }, setView, T);

  /* Slash */
  const handleEdKey = (e) => {
    if (e.key === "/" && !slashOpen) { const r = e.target.getBoundingClientRect(); setSlashPos({ x: r.left + 20, y: Math.min(r.bottom, window.innerHeight - 280) }); setSlashOpen(true); setSlashQ(""); }
    else if (slashOpen && e.key === "Escape") setSlashOpen(false);
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); if (undoStack.length) { const prev = undoStack[undoStack.length - 1]; setRedo((p) => [...p, currentDoc?.content || ""]); setUndo((p) => p.slice(0, -1)); if (currentDoc) updateDoc(currentDoc.id, { content: prev }); } }
    if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); if (redoStack.length) { const next = redoStack[redoStack.length - 1]; setUndo((p) => [...p, currentDoc?.content || ""]); setRedo((p) => p.slice(0, -1)); if (currentDoc) updateDoc(currentDoc.id, { content: next }); } }
  };
  const handleEdInput = (e) => { const v = e.target.value; pushUndo(currentDoc?.content || ""); updateDoc(currentDoc.id, { content: v }); if (slashOpen) { const li = v.lastIndexOf("/"); if (li >= 0) setSlashQ(v.slice(li + 1).split("\n")[0]); else setSlashOpen(false); } };
  const handleSlashSel = (cmd) => {
    if (!currentDoc) return;
    const c = currentDoc.content || ""; const li = c.lastIndexOf("/"); const before = li >= 0 ? c.slice(0, li) : c; const after = li >= 0 ? c.slice(li + 1 + slashQ.length) : "";
    if (cmd.ai) {
      // Remove the slash text first
      updateDoc(currentDoc.id, { content: before + after });
      setSlashOpen(false);
      if (!getGroqKey()) { setAiSetup(true); return; }
      if (cmd.ai === "continue") {
        setAiWrite({ open: true, mode: "continue" });
      } else if (cmd.cmd === "summarize") {
        setAiWrite({ open: true, mode: "summarize" });
      } else {
        setAiWrite({ open: true, mode: cmd.cmd });
      }
      return;
    }
    updateDoc(currentDoc.id, { content: before + cmd.ins + after }); setSlashOpen(false); edRef.current?.focus();
  };
  const handleAiWrite = async (prompt, mode) => {
    if (!currentDoc) return;
    setAiWriting(true);
    let finalPrompt = prompt;
    if (mode === "continue") finalPrompt = "Continue writing this document naturally from where it ends. Maintain the same style and structure.";
    else if (mode === "summarize") finalPrompt = "Write a concise summary of this document.";
    else if (mode === "brainstorm") finalPrompt = `Brainstorm ideas about: ${prompt}. Use bullet lists.`;
    else if (mode === "draft") finalPrompt = `Draft a document about: ${prompt}`;
    const result = await genContent(finalPrompt, currentDoc.content, lang);
    setAiWriting(false);
    if (result === "NO_KEY") { setAiWrite({ open: false, mode: "ai" }); setAiSetup(true); return; }
    if (!result) { notify(T("aiWriteError"), "⚠️"); return; }
    pushUndo(currentDoc.content || "");
    updateDoc(currentDoc.id, { content: (currentDoc.content || "") + "\n\n" + result });
    setAiWrite({ open: false, mode: "ai" });
    edRef.current?.focus();
    notify("✨ AI", "✦");
  };

  const favDocs = useMemo(() => favs.map((id) => findDoc(docs, id)).filter(Boolean), [favs, docs]);
  const recentDocs = useMemo(() => recent.map((id) => findDoc(docs, id)).filter(Boolean), [recent, docs]);
  const filteredTasks = useMemo(() => {
    const arToday = todayAR();
    const arTime = nowAR_HM();
    const [arHStr, arMStr] = arTime.split(":");
    const arTotal = parseInt(arHStr, 10) * 60 + parseInt(arMStr, 10);
    /* Show task in timers if: no dueTime (unscheduled), OR dueDate is today AND current AR time >= scheduled time (within same hour), OR task is already running */
    const visible = tasks.filter((tk) => {
      if (!tk.dueTime) return true;
      if (tk.running || tk.done) return true;
      if (tk.dueDate === arToday) {
        const [schHStr, schMStr] = tk.dueTime.split(":");
        const schH = parseInt(schHStr, 10);
        const schTotal = schH * 60 + parseInt(schMStr || "0", 10);
        /* Visible from the scheduled minute until the end of that hour */
        return arTotal >= schTotal && arTotal < (schH + 1) * 60;
      }
      return false;
    });
    return filterTasks(visible);
  }, [tasks, filters]);

  /* ═══════ LOCAL DB SYNC ═══════ */
  // Load everything from IndexedDB on mount
  useEffect(() => {
    (async () => {
      const [savedTasks, savedDocs, savedTrash, savedSettings] = await Promise.all([
        db.loadTasks(), db.loadDocs(), db.loadTrash(), db.loadSettings(),
      ]);
      const isFirstVisit = !savedSettings;
      if (isFirstVisit) {
        // Seed sample data only on truly first visit
        const sampleTasks = [mkTask("Deep Focus", 25, "P1", ["focus"]), mkTask("Short Break", 5, "P3", ["break"])];
        const sampleDocs = [
          { id: "wf", name: "Getting Started", type: "folder", children: [
            { id: "intro", name: "Welcome", type: "doc", icon: "🚀", cover: COVERS[0], history: [], content: "# Welcome to eterOrg\n\nYour docs and timers, **connected**.\n\n## Features\n\n- Write PRDs — generate timed tasks with AI\n- **Kanban board** + **Table** + **Calendar** + **Gallery** views\n- **Wiki links**: `[[Document Name]]`\n- **Slash commands**: type `/` in editor\n- **Templates** for common docs\n- **⌘B / Ctrl+B** global search\n- **Drag & drop** everything\n- **Sub-tasks**, filters, reminders, trash, undo/redo\n\n>>> Toggle Lists\n  Use `>>>` for collapsible sections\n\n!!! tip Try creating tasks from the Example PRD\n\n| Feature | Status |\n|---------|--------|\n| Kanban | ✅ |\n| Calendar | ✅ |\n| Gallery | ✅ |\n| Filters | ✅ |\n\nLink to [[Example PRD]] to see it in action.", relatedTasks: [], createdAt: now() },
            { id: "eprd", name: "Example PRD", type: "doc", icon: "🎯", cover: COVERS[1], history: [], content: "# Landing Page Redesign\n\n## Objective\nRedesign landing page to improve conversion by 25%.\n\n## Scope\n\n### Design\n- Wireframes for desktop & mobile\n- New hero section with animations\n- Pricing comparison table\n- Testimonials carousel\n\n### Development\n- Responsive hero with CSS animations\n- Pricing toggle monthly/annual\n- Testimonials API integration\n- Form validation\n- A/B testing framework\n\n### QA\n- Cross-browser testing\n- Performance audit (LCP < 2s)\n- Deployment docs\n- Analytics tracking\n\n| Phase | Duration | Owner |\n|-------|----------|-------|\n| Design | 1 week | Design |\n| Dev | 2 weeks | Eng |\n| QA | 3 days | QA |\n\n!!! info See [[Welcome]] for tool overview", relatedTasks: [], createdAt: now() },
          ]},
          { id: "nf", name: "Project Notes", type: "folder", children: [] },
        ];
        setTasks(sampleTasks);
        setDocs(sampleDocs);
        setFavs(["intro"]);
      } else {
        // Returning user — load whatever is in DB (even if empty)
        if (Array.isArray(savedTasks)) setTasks(savedTasks);
        if (Array.isArray(savedDocs)) setDocs(savedDocs);
        if (savedTrash) setTrash(savedTrash);
        if (savedSettings.userName) setUserName(savedSettings.userName);
        if (savedSettings.userRole) setUserRole(savedSettings.userRole);
        if (savedSettings.onboarded) setOnboarded(true);
        if (savedSettings.darkMode !== undefined) setDk(savedSettings.darkMode);
        if (savedSettings.lang) setLang(savedSettings.lang);
        if (savedSettings.favs) setFavs(savedSettings.favs);
        if (savedSettings.recent) setRecent(savedSettings.recent);
        if (savedSettings.muted) setMuted(true);
      }
      setDbReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save tasks (debounced 800ms)
  useEffect(() => {
    if (!dbReady) return;
    const timer = setTimeout(() => db.saveTasks(tasks), 800);
    return () => clearTimeout(timer);
  }, [tasks, dbReady]);

  // Auto-save docs (debounced 1200ms — docs can be large)
  useEffect(() => {
    if (!dbReady) return;
    const timer = setTimeout(() => db.saveDocs(docs), 1200);
    return () => clearTimeout(timer);
  }, [docs, dbReady]);

  // Auto-save settings (debounced 600ms)
  useEffect(() => {
    if (!dbReady) return;
    const timer = setTimeout(() => {
      db.saveSettings({
        id: "default", userName, userRole,
        darkMode: dk, lang, onboarded, favs, recent, muted,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [userName, userRole, dk, lang, onboarded, favs, recent, muted, dbReady]);

  const STab = ({ icon, label, active, onClick, badge }) => (
    <button onClick={onClick} title={isMini ? label : undefined} style={{ display: "flex", alignItems: "center", justifyContent: isMini ? "center" : "flex-start", gap: isMini ? 0 : 8, width: "100%", padding: isMini ? "8px 0" : "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: sf, color: active ? t.fg : t.mt, background: active ? t.at : "transparent", transition: "all .12s", position: "relative" }}>
      {icon}{!isMini && <span>{label}</span>}{badge > 0 && <span style={{ position: isMini ? "absolute" : "static", top: isMini ? 2 : undefined, right: isMini ? 4 : undefined, marginLeft: isMini ? 0 : "auto", fontSize: isMini ? 8 : 10, fontFamily: sf, background: t.badge, padding: isMini ? "0 4px" : "0px 6px", borderRadius: 8, color: t.mt, lineHeight: isMini ? "14px" : undefined }}>{badge}</span>}
    </button>
  );

  /* ═══════ LOADING ═══════ */
  if (!dbReady) {
    return (
      <div style={{ height: "100vh", background: t.bg, color: t.fg, fontFamily: sf, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: R, display: "flex", alignItems: "center", justifyContent: "center", animation: "float 2s ease-in-out infinite" }}><TimerI s={24} c="#fff" /></div>
        <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>eter<span style={{ color: R }}>Org</span></h2>
        <div style={{ width: 14, height: 14, border: `2.5px solid ${t.bd}`, borderTopColor: R, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  /* ═══════ ONBOARDING ═══════ */
  if (!onboarded) {
    const roles = T("roles");
    const canC = onboardStep === 0 ? userName.trim().length > 0 : userRole.length > 0;
    return (
      <div style={{ height: "100vh", background: t.bg, color: t.fg, fontFamily: sf, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "background .4s", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: `${R}08`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 350, height: 350, borderRadius: "50%", background: `${B}06`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", top: 20, right: 24, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setLang(lang === "en" ? "es" : "en")} style={{ height: 24, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600, color: t.fg }}>{lang === "en" ? "ES" : "EN"}</button>
          <button onClick={() => setDk(!dk)} style={{ width: 42, height: 24, borderRadius: 12, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", position: "relative", padding: 0 }}>
            <div style={{ width: 17, height: 17, borderRadius: "50%", background: t.fg, position: "absolute", top: 2, left: dk ? 21 : 2, transition: "left .3s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{dk ? <SunI s={9} c={t.bg} /> : <MoonI s={9} c={t.bg} />}</div>
          </button>
        </div>
        <div style={{ maxWidth: 480, width: "100%", padding: "0 32px", animation: "scaleIn .5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: R, display: "flex", alignItems: "center", justifyContent: "center", animation: "float 4s ease-in-out infinite" }}><TimerI s={24} c="#fff" /></div>
            <div><h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>eter<span style={{ color: R }}>Org</span></h1><p style={{ fontSize: 11, fontFamily: sf, color: t.mt, letterSpacing: "0.1em", marginTop: 3 }}>ORGANIZE · EXECUTE · DELIVER</p></div>
          </div>
          {onboardStep === 0 && <div style={{ animation: "scaleIn .3s ease" }}><p style={{ fontSize: 14, color: t.mt, marginBottom: 6 }}>{greeting} 👋</p><h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.035em", marginBottom: 28 }}>{T("whatsYourName")}</h2><input autoFocus value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && canC && setOBS(1)} placeholder={T("enterYourName")} style={{ width: "100%", height: 54, borderRadius: 14, border: `2px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 20px", fontFamily: sf, fontSize: 18, fontWeight: 500 }} /></div>}
          {onboardStep === 1 && <div style={{ animation: "scaleIn .3s ease" }}><p style={{ fontSize: 14, color: t.mt, marginBottom: 6 }}>{T("niceToMeet")} <span style={{ color: t.fg, fontWeight: 600 }}>{userName}</span></p><h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.035em", marginBottom: 28 }}>{T("whatDoYouDo")}</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{roles.map((r) => <button key={r} onClick={() => setUserRole(r)} style={{ height: 52, borderRadius: 12, border: userRole === r ? `2px solid ${R}` : `1.5px solid ${t.bd}`, background: userRole === r ? `${R}12` : t.card, color: userRole === r ? t.fg : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 14, fontWeight: 500 }}>{r}</button>)}</div></div>}
          {onboardStep === 2 && <div style={{ animation: "scaleIn .3s ease", textAlign: "center" }}><div style={{ fontSize: 56, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>🚀</div><h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.035em", marginBottom: 10 }}>{T("allSet")} {userName}!</h2><p style={{ fontSize: 14, color: t.mt, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>{T("workspaceReady")}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "20px 0" }}>{T("featurePills").map((f) => <div key={f} style={{ padding: "5px 12px", borderRadius: 7, background: t.card, border: `1px solid ${t.bd}`, fontSize: 11, color: t.mt }}>{f}</div>)}</div></div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36 }}>
            <div>{onboardStep > 0 && <button onClick={() => setOBS(onboardStep - 1)} style={{ height: 40, padding: "0 16px", borderRadius: 10, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 13 }}>{T("back")}</button>}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", gap: 6 }}>{[0, 1, 2].map((s) => <div key={s} style={{ width: s === onboardStep ? 20 : 6, height: 6, borderRadius: 3, background: s === onboardStep ? R : s < onboardStep ? G : t.bd, transition: "all .3s" }} />)}</div>
              <button onClick={() => { if (onboardStep < 2) setOBS(onboardStep + 1); else setOnboarded(true); }} disabled={!canC && onboardStep < 2} style={{ height: 44, padding: "0 28px", borderRadius: 12, border: "none", background: (!canC && onboardStep < 2) ? t.bd : R, color: (!canC && onboardStep < 2) ? t.mt : "#fff", cursor: (!canC && onboardStep < 2) ? "not-allowed" : "pointer", fontFamily: sf, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{onboardStep === 2 ? T("getStarted") : T("continue")} <ArrowR s={16} /></button>
            </div>
          </div>
          {onboardStep < 2 && <button onClick={() => { setUserName(userName || "User"); setOnboarded(true); }} style={{ display: "block", margin: "20px auto 0", border: "none", background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12 }}>{T("skipSetup")}</button>}
        </div>
      </div>
    );
  }

  /* ═══════ MAIN RENDER ═══════ */
  return (
    <div style={{ display: "flex", height: "100vh", background: t.bg, color: t.fg, fontFamily: sf, transition: "background .4s,color .4s", overflow: "hidden" }}>

      <Toasts items={notifs} onDismiss={(id) => setNotifs((p) => p.filter((n) => n.id !== id))} t={t} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} tasks={tasks} docs={docs} setAD={(id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }} setV={setView} t={t} T={T} />
      {aiPreview && <TaskPreview tasks={aiPreview.tasks} docName={aiPreview.docName} t={t} T={T} onCancel={() => setAiP(null)} onConfirm={confirmAi} onToggle={(i) => setAiP((p) => ({ ...p, tasks: p.tasks.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)) }))} onTime={(i, m) => setAiP((p) => ({ ...p, tasks: p.tasks.map((x, j) => (j === i ? { ...x, minutes: m } : x)) }))} />}
      {templateOpen && (
        <div onClick={() => setTemplateOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: t.ov, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.bd}` }}><h3 style={{ fontSize: 16, fontWeight: 700 }}>{T("chooseTemplate")}</h3></div>
            <div style={{ padding: "8px 12px" }}>{TMPLS.map((tm, i) => <button key={i} onClick={() => addDocTmpl(tm)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 14px", borderRadius: 10, border: "none", background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 14, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = t.hv)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><span style={{ fontSize: 18 }}>{tm.i}</span>{tm.n}</button>)}</div>
            <div style={{ padding: "8px 12px 12px" }}><button onClick={() => setTemplateOpen(false)} style={{ width: "100%", height: 36, borderRadius: 10, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontSize: 12 }}>{T("cancel")}</button></div>
          </div>
        </div>
      )}
      {historyOpen && currentDoc && (
        <div onClick={() => setHistoryOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: t.ov, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="fi" style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.bd}`, display: "flex", justifyContent: "space-between" }}><h3 style={{ fontSize: 16, fontWeight: 700 }}>{T("versionHistory")}</h3><button onClick={() => setHistoryOpen(false)} style={{ ...sB(t), width: 28, height: 28 }}><XI s={12} /></button></div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {(!currentDoc.history || !currentDoc.history.length) ? <div style={{ padding: 30, textAlign: "center", color: t.mt, fontSize: 13 }}>{T("noHistoryYet")}</div>
              : currentDoc.history.map((h, i) => <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${t.bd}` }}><div style={{ fontSize: 13, fontWeight: 500 }}>{h.date}</div><button onClick={() => { updateDoc(currentDoc.id, { content: h.content }); setHistoryOpen(false); notify(T("versionRestored"), "⏪"); }} style={{ height: 28, padding: "0 10px", borderRadius: 7, border: `1px solid ${t.bd}`, background: "transparent", color: t.fg, cursor: "pointer", fontSize: 11 }}>{T("restore")}</button></div>)}
            </div>
          </div>
        </div>
      )}
      {trashOpen && <TrashModal trash={trash} onRestore={restoreTrash} onPermanent={permDelete} onClose={() => setTrashOpen(false)} t={t} T={T} />}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} t={t} T={T} />
      <AiSetupModal open={aiSetup} onClose={() => setAiSetup(false)} onSave={handleAiKeySave} hasKey={!!getGroqKey()} t={t} T={T} />
      <AiWriteModal open={aiWrite.open} mode={aiWrite.mode} onClose={() => setAiWrite({ open: false, mode: "ai" })} onSubmit={handleAiWrite} loading={aiWriting} t={t} T={T} />
      {slashOpen && <SlashMenu query={slashQ} onSelect={handleSlashSel} pos={slashPos} t={t} T={T} />}
      <input ref={importRef} type="file" accept=".md,.txt" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) importDoc(e.target.files[0]); e.target.value = ""; }} />

      {/* ═══ SIDEBAR ═══ */}
      <div style={{ width: sbW, minWidth: sbW, background: t.sb, borderRight: sbMode !== "closed" ? `1px solid ${t.bd}` : "none", display: "flex", flexDirection: "column", transition: "all .25s cubic-bezier(.4,0,.2,1)", overflow: "hidden" }}>
        <div style={{ padding: isMini ? "10px 6px 8px" : "14px 14px 10px", borderBottom: `1px solid ${t.bd}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: isMini ? "center" : "space-between", marginBottom: isMini ? 8 : 12 }}>
            {!isMini && <div><h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" }}>eter<span style={{ color: R }}>Org</span></h1>{userName && <span style={{ fontSize: 10, fontFamily: sf, color: t.mt }}>{userName}</span>}</div>}
            <div style={{ display: "flex", gap: 3, flexDirection: isMini ? "column" : "row", alignItems: "center" }}>
              {isMini && <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>e<span style={{ color: R }}>O</span></div>}
              {!isMini && <button onClick={() => setSearchOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title="Ctrl+B"><SearchI s={11} /></button>}
              <button onClick={toggleSb} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={isMini ? T("timers") : undefined}><SideI s={11} /></button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <STab icon={<TimerI s={13} />} label={T("timers")} active={view === "timers"} onClick={() => setView("timers")} badge={tasks.filter((x) => x.running).length} />
            <STab icon={<Board s={13} />} label={T("board")} active={view === "board"} onClick={() => setView("board")} />
            <STab icon={<TableI s={13} />} label={T("table")} active={view === "table"} onClick={() => setView("table")} />
            <STab icon={<CalI s={13} />} label={T("calendar")} active={view === "calendar"} onClick={() => setView("calendar")} />
            <STab icon={<GallI s={13} />} label={T("gallery")} active={view === "gallery"} onClick={() => setView("gallery")} />
            <STab icon={<FileT s={13} />} label={T("docs")} active={view === "docs"} onClick={() => setView("docs")} />
          </div>
        </div>
        {!isMini && <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
          {favDocs.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf, display: "flex", alignItems: "center", gap: 4 }}><Star s={8} c={Y} /> {T("favorites")}</div>{favDocs.map((d) => <button key={d.id} onClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(false); addRecent(d.id); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 10px", borderRadius: 6, border: "none", background: activeDoc === d.id ? t.at : "transparent", color: activeDoc === d.id ? t.fg : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, textAlign: "left" }}><span style={{ fontSize: 10 }}>{d.icon || "📄"}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span></button>)}</div>}
          {recentDocs.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>⏱ {T("recent")}</div>{recentDocs.slice(0, 4).map((d) => <button key={d.id} onClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 10px", borderRadius: 6, border: "none", background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, textAlign: "left" }}><span style={{ fontSize: 10 }}>{d.icon || "📄"}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span></button>)}</div>}
          {(view === "timers" || view === "board" || view === "table" || view === "calendar") && <div><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>{T("tasks")} · {tasks.filter((x) => x.done).length}/{tasks.length}</div>{tasks.slice(0, 15).map((tk) => <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, fontSize: 12, color: tk.done ? t.mt : t.fg, textDecoration: tk.done ? "line-through" : "none" }}><div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: tk.done ? G : tk.running ? Y : t.bd, animation: tk.running ? "pulse 2s infinite" : "none" }} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.name}</span><span style={{ fontSize: 10, fontFamily: sf, color: t.mt, flexShrink: 0 }}>{fmt(tk.remaining)}</span></div>)}</div>}
          {view === "docs" && <div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", marginBottom: 2 }}><span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, fontFamily: sf }}>{T("documents")}</span><div style={{ display: "flex", gap: 2 }}><button onClick={addBlankDoc} style={{ ...tB(t), width: 18, height: 18 }}><Plus s={9} /></button><button onClick={addRootFolder} style={{ ...tB(t), width: 18, height: 18 }}><Fold s={8} /></button><button onClick={() => setTemplateOpen(true)} style={{ ...tB(t), width: 18, height: 18 }} title="Template">✦</button><button onClick={() => importRef.current?.click()} style={{ ...tB(t), width: 18, height: 18 }} title="Import .md"><UpI s={8} /></button></div></div>{docs.map((n) => <DocTree key={n.id} node={n} depth={0} activeDoc={activeDoc} setAD={(id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }} docs={docs} setDocs={setDocs} t={t} favs={favs} toggleFav={toggleFav} drag={drag} setDrag={setDrag} />)}</div>}
          {view === "gallery" && <div><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>{T("documents")}</div></div>}
        </div>}
        {isMini && <div style={{ flex: 1 }} />}
        <div style={{ padding: isMini ? "8px 4px" : "8px 12px", borderTop: `1px solid ${t.bd}` }}>
          <div style={{ display: "flex", flexDirection: isMini ? "column" : "row", alignItems: "center", justifyContent: isMini ? "center" : "space-between", gap: isMini ? 4 : 0 }}>
            <div style={{ display: "flex", flexDirection: isMini ? "column" : "row", gap: 4, alignItems: "center" }}>
              <button onClick={() => setTrashOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("trash")}><Trash s={10} /></button>
              <button onClick={() => setSearchOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("helpShortcutSearch")}><SearchI s={10} /></button>
              <button onClick={() => setHelpOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("helpShortcutHelp")}><HelpI s={10} /></button>
              <button onClick={requestNotifPerm} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("enableNotifications")}><BellI s={10} /></button>
              <button onClick={() => { setMuted(!muted); notify(muted ? T("soundOn") : T("soundOff"), muted ? "🔊" : "🔇"); }} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6, color: muted ? R : t.mt, fontSize: 11 }} title={muted ? T("soundOn") : T("soundOff")}>{muted ? "🔇" : "🔊"}</button>
              <button onClick={() => { if (getGroqKey()) { setGroqKey(""); notify(T("apiKeyCleared"), "🔑"); } else { setAiSetup(true); } }} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6, color: getGroqKey() ? G : t.mt }} title={getGroqKey() ? T("clearApiKey") : T("setApiKey")}><KeyI s={10} /></button>
            </div>
            {!isMini && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setLang(lang === "en" ? "es" : "en")} style={{ height: 22, padding: "0 6px", borderRadius: 6, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", fontFamily: sf, fontSize: 9, fontWeight: 600, color: t.fg }}>{lang === "en" ? "ES" : "EN"}</button>
              <button onClick={() => setDk(!dk)} style={{ width: 40, height: 22, borderRadius: 11, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", position: "relative", padding: 0 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: t.fg, position: "absolute", top: 1.5, left: dk ? 20 : 1.5, transition: "left .3s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{dk ? <SunI s={8} c={t.bg} /> : <MoonI s={8} c={t.bg} />}</div></button>
            </div>}
            {isMini && <>
              <button onClick={() => setLang(lang === "en" ? "es" : "en")} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6, fontFamily: sf, fontSize: 8, fontWeight: 700 }} title={T("language")}>{lang === "en" ? "ES" : "EN"}</button>
              <button onClick={() => setDk(!dk)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={dk ? "Light" : "Dark"}>{dk ? <SunI s={10} /> : <MoonI s={10} />}</button>
            </>}
          </div>
          {!isMini && <div className="desktop-only" style={{ display: "flex", gap: 10, marginTop: 6, paddingTop: 5, borderTop: `1px solid ${t.bd}08` }}>
            <span style={{ fontSize: 9, fontFamily: sf, color: t.mt, display: "flex", alignItems: "center", gap: 3, opacity: 0.7 }}><SearchI s={8} c={t.mt} /> Ctrl+B</span>
            <span style={{ fontSize: 9, fontFamily: sf, color: t.mt, display: "flex", alignItems: "center", gap: 3, opacity: 0.7 }}><HelpI s={8} c={t.mt} /> Ctrl+H</span>
          </div>}
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {sbMode === "closed" && (
          <div style={{ padding: "8px 16px", borderBottom: `1px solid ${t.bd}`, display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setSbMode("open")} style={sB(t)}><SideI s={14} /></button>
            <h1 style={{ fontSize: 14, fontWeight: 700 }}>eter<span style={{ color: R }}>Org</span></h1><div style={{ flex: 1 }} />
            {["timers", "board", "table", "calendar", "gallery", "docs"].map((v) => <button key={v} onClick={() => setView(v)} style={{ height: 26, padding: "0 8px", borderRadius: 6, border: `1px solid ${view === v ? t.fg : t.bd}`, background: view === v ? t.at : "transparent", color: view === v ? t.fg : t.mt, cursor: "pointer", fontSize: 10, fontWeight: 500, fontFamily: sf, textTransform: "capitalize" }}>{v}</button>)}
            <button onClick={() => setSearchOpen(true)} style={sB(t)}><SearchI s={14} /></button>
            <button onClick={() => setHelpOpen(true)} style={sB(t)} title={T("help")}><HelpI s={14} /></button>
            <button onClick={requestNotifPerm} style={sB(t)} title={T("enableNotifications")}><BellI s={14} /></button>
            <button onClick={() => setDk(!dk)} style={sB(t)}>{dk ? <SunI s={14} /> : <MoonI s={14} />}</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: view === "board" ? "20px 16px" : "28px 24px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: view === "board" ? 1100 : view === "table" ? 920 : view === "calendar" ? 900 : view === "gallery" ? 900 : 680 }}>

            {/* ═══ TIMERS ═══ */}
            {view === "timers" && <div className="fi">
              <div style={{ marginBottom: 24 }}><p style={{ fontSize: 12, color: t.mt, marginBottom: 3 }}>{greeting}{userName ? `, ${userName}` : ""} 👋</p><h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>{T("timers")}</h2><p style={{ fontSize: 11, color: t.mt, marginTop: 4, fontFamily: sf }}>{tasks.filter((x) => x.done).length}/{tasks.length} {T("completed")}</p></div>
              <FilterBar filters={filters} setFilters={setFilters} t={t} T={T} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredTasks.length === 0 && !showAdd && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}><div className="glass-bar" style={{ textAlign: "center", padding: "36px 44px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 340 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><TimerI s={22} c={t.mt} /></div><div style={{ fontSize: 15, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 5, letterSpacing: "-0.02em" }}>{T("timersEmpty")}</div><div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 16 }}>{T("timersEmptyDesc")}</div><button onClick={() => setShowAdd(true)} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${G}40` }}><Plus s={12} />{T("addTask")}</button></div></div>}
                {filteredTasks.map((task) => { const total = task.totalSeconds || task.minutes * 60, prog = total > 0 ? (total - task.remaining) / total : 0; const pr = PRIOS.find((p) => p.k === task.priority) || PRIOS[2];
                  return (
                    <div key={task.id} className="fi" draggable onDragStart={() => setTaskDrag(task.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (taskDrag && taskDrag !== task.id) reorderT(taskDrag, task.id); setTaskDrag(null); }}
                      style={{ background: t.card, border: `1px solid ${t.bd}`, borderRadius: 14, padding: "20px 22px", opacity: task.done ? .5 : 1, position: "relative", overflow: "hidden", cursor: "grab" }}>
                      {task.done && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: G }} />}
                      {task.running && <div style={{ position: "absolute", top: 0, left: 0, width: `${prog * 100}%`, height: 2.5, background: Y, transition: "width 1s linear" }} />}
                      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <Ring p={prog} sz={90} st={3} t={t} run={task.running} dn={task.done} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: sm, fontSize: 20, fontWeight: 300, lineHeight: 1, textDecoration: task.done ? "line-through" : "none", color: task.done ? t.mt : t.fg }}>{fmt(task.remaining)}</span>
                            <span style={{ fontSize: 8, letterSpacing: "0.12em", color: task.running ? Y : t.mt, marginTop: 3, textTransform: "uppercase", fontFamily: sf, fontWeight: task.running ? 600 : 400 }}>{task.done ? T("done") : task.running ? T("active") : T("idle")}</span>
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 600, textDecoration: task.done ? "line-through" : "none" }}>{task.name}</h3>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                                <span style={pill(pr.c)}>{task.priority}</span>
                                <span style={{ fontSize: 10, fontFamily: sf, color: t.mt }}>{fmtDur(task.totalSeconds || task.minutes * 60)}</span>
                                {task.dueDate && <span style={{ fontSize: 10, fontFamily: sf, color: task.dueDate < today() ? R : t.mt }}>📅 {task.dueDate}</span>}
                                {task.reminder && <span style={{ fontSize: 10, color: O }}>🔔 {task.reminder.minutes}m</span>}
                                {task.assignee && <span style={{ fontSize: 10, color: t.mt }}>@{task.assignee}</span>}
                                {(task.tags || []).map((tg, i) => <span key={i} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: `${TC[i % TC.length]}15`, color: TC[i % TC.length], fontFamily: sf }}>{tg}</span>)}
                                {task.fromDoc && <span style={{ ...pill(R), fontSize: 9, border: "none" }}><LinkI s={8} c={R} />{task.fromDoc}</span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 3 }}>
                              <select value="" onChange={(e) => { if (e.target.value === "5" || e.target.value === "10" || e.target.value === "15") setReminder(task.id, +e.target.value); if (e.target.value === "clear") setReminder(task.id, null); }} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontSize: 10, opacity: .6, appearance: "none", textAlign: "center", padding: 0, backgroundImage: "none" }} title={T("setReminder")}><option value="">🔔</option><option value="5">5m</option><option value="10">10m</option><option value="15">15m</option><option value="clear">{T("clear")}</option></select>
                              <button onClick={() => resetT(task.id)} style={{ ...sB(t), width: 28, height: 28 }}><ResetI s={11} /></button>
                              <button onClick={() => removeT(task.id)} style={{ ...sB(t), width: 28, height: 28 }}><Trash s={11} /></button>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginBottom: task.subtasks?.length ? 8 : 0 }}>
                            <button onClick={() => play(task.id)} disabled={task.done || task.running} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", cursor: task.done || task.running ? "not-allowed" : "pointer", background: task.done || task.running ? `${G}18` : G, color: task.done || task.running ? `${G}55` : "#fff", fontFamily: sf, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><PlayI s={10} />{T("play")}</button>
                            <button onClick={() => pause(task.id)} disabled={!task.running} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", cursor: !task.running ? "not-allowed" : "pointer", background: !task.running ? `${Y}18` : Y, color: !task.running ? `${Y}55` : "#0A0A0A", fontFamily: sf, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>❚❚ {T("pause")}</button>
                            <button onClick={() => markDone(task.id)} disabled={task.done} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", cursor: task.done ? "not-allowed" : "pointer", background: task.done ? `${R}18` : R, color: task.done ? `${R}55` : "#fff", fontFamily: sf, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>✓ {T("done")}</button>
                          </div>
                          {task.subtasks?.length > 0 && <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.bd}` }}>
                            {task.subtasks.map((st) => <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0", fontSize: 12, color: st.done ? t.mt : t.fg }}>
                              <button onClick={() => toggleSub(task.id, st.id)} style={{ width: 16, height: 16, borderRadius: 4, border: st.done ? "none" : `1.5px solid ${t.bd}`, background: st.done ? G : "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0, padding: 0 }}>{st.done && "✓"}</button>
                              <span style={{ textDecoration: st.done ? "line-through" : "none" }}>{st.name}</span>
                            </div>)}
                          </div>}
                          <SubTaskInput taskId={task.id} addSub={addSub} t={t} T={T} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!showAdd
                  ? <button onClick={() => setShowAdd(true)} style={{ height: 44, borderRadius: 12, border: `1.5px dashed ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus s={14} />{T("addTask")}</button>
                  : <div className="fi" style={{ background: t.card, border: `1px solid ${t.bd}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input autoFocus value={nN} onChange={(e) => setNN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder={T("taskName")} style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 12px", fontFamily: sf, fontSize: 13 }} /><div style={{ display: "flex", alignItems: "center", gap: 2 }}><input type="number" min={0} value={nM} onChange={(e) => setNM(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 44, height: 36, borderRadius: "8px 0 0 8px", border: `1px solid ${t.bd}`, borderRight: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 13, textAlign: "center" }} title="min" /><span style={{ height: 36, display: "flex", alignItems: "center", background: t.inp, color: t.mt, fontSize: 9, fontFamily: sf, borderTop: `1px solid ${t.bd}`, borderBottom: `1px solid ${t.bd}`, padding: "0 1px" }}>:</span><input type="number" min={0} max={59} value={nS} onChange={(e) => setNS(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 44, height: 36, borderRadius: "0 8px 8px 0", border: `1px solid ${t.bd}`, borderLeft: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 13, textAlign: "center" }} title="sec" /></div></div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <select value={nP} onChange={(e) => setNP(e.target.value)} style={{ flex: 1, height: 32, borderRadius: 7, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 6px" }}>{PRIOS.map((p) => <option key={p.k} value={p.k}>{T(p.lk)}</option>)}</select>
                      <input value={nT} onChange={(e) => setNT(e.target.value)} placeholder={T("tags")} style={{ flex: 1, height: 32, borderRadius: 7, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 8px" }} />
                      <input value={nA} onChange={(e) => setNA(e.target.value)} placeholder={T("assignee")} style={{ flex: 1, height: 32, borderRadius: 7, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 8px" }} />
                      <input type="date" value={nD} onChange={(e) => setND(e.target.value)} style={{ flex: 1, height: 32, borderRadius: 7, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 11, padding: "0 6px" }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}><button onClick={addTask} style={{ flex: 1, height: 34, borderRadius: 8, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600 }}>{T("add")}</button><button onClick={() => setShowAdd(false)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", fontSize: 14 }}>×</button></div>
                  </div>}
              </div>
            </div>}

            {/* ═══ BOARD ═══ */}
            {view === "board" && <div className="fi"><h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>{T("board")}</h2><FilterBar filters={filters} setFilters={setFilters} t={t} T={T} />
              {filteredTasks.length === 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}><div className="glass-bar" style={{ textAlign: "center", padding: "36px 44px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 340 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Board s={22} c={t.mt} /></div><div style={{ fontSize: 15, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 5, letterSpacing: "-0.02em" }}>{T("boardEmpty")}</div><div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 16 }}>{T("boardEmptyDesc")}</div><button onClick={() => { setView("timers"); setShowAdd(true); }} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${G}40` }}><Plus s={12} />{T("addTask")}</button></div></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, minHeight: filteredTasks.length ? 360 : 0 }}>
                {STS.map((status) => <div key={status} onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = t.dr; }} onDragLeave={(e) => { e.currentTarget.style.background = t.kc; }} onDrop={(e) => { e.currentTarget.style.background = t.kc; const id = e.dataTransfer.getData("taskId"); if (id) chgStatus(id, status); }} style={{ background: t.kc, borderRadius: 12, padding: "12px 10px", border: `1px solid ${t.bd}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 4px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: STC[status] }} /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: sf, color: t.fg }}>{STL[status]}</span><span style={{ fontSize: 10, fontFamily: sf, color: t.mt, marginLeft: "auto" }}>{filteredTasks.filter((tk) => (tk.status || "todo") === status).length}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {filteredTasks.filter((tk) => (tk.status || "todo") === status).map((tk) => { const pr = PRIOS.find((p) => p.k === tk.priority) || PRIOS[2]; return (
                      <div key={tk.id} draggable onDragStart={(e) => e.dataTransfer.setData("taskId", tk.id)} style={{ background: t.card, border: `1px solid ${t.bd}`, borderRadius: 10, padding: "12px 14px", cursor: "grab" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{tk.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 6 }}><span style={pill(pr.c)}>{tk.priority}</span><span style={{ fontSize: 10, fontFamily: sf, color: t.mt }}>{fmtDur(tk.totalSeconds || tk.minutes * 60)}</span>{tk.dueDate && <span style={{ fontSize: 10, color: t.mt }}>📅{tk.dueDate}</span>}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: sm, fontSize: 13, color: tk.done ? t.mt : t.fg }}>{fmt(tk.remaining)}</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {!tk.done && !tk.running && <button onClick={() => play(tk.id)} style={{ ...tB(t), background: `${G}20`, color: G }}><PlayI s={10} /></button>}
                            {tk.running && <button onClick={() => pause(tk.id)} style={{ ...tB(t), background: `${Y}20`, color: Y }}>❚❚</button>}
                            {!tk.done && <button onClick={() => markDone(tk.id)} style={{ ...tB(t), background: `${R}20`, color: R }}>✓</button>}
                          </div>
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>)}
              </div>
            </div>}

            {/* ═══ TABLE ═══ */}
            {view === "table" && <div className="fi"><h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>{T("table")}</h2><FilterBar filters={filters} setFilters={setFilters} t={t} T={T} />
              {filteredTasks.length === 0 ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}><div className="glass-bar" style={{ textAlign: "center", padding: "36px 44px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 340 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><TableI s={22} c={t.mt} /></div><div style={{ fontSize: 15, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 5, letterSpacing: "-0.02em" }}>{T("tableEmpty")}</div><div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 16 }}>{T("tableEmptyDesc")}</div><button onClick={() => { setView("timers"); setShowAdd(true); }} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${G}40` }}><Plus s={12} />{T("addTask")}</button></div></div> :
              <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.bd}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: sf, fontSize: 13 }}>
                  <thead><tr style={{ background: t.card }}>{[T("task"), T("priority"), T("status"), T("time"), T("due"), T("tags"), T("assignee"), T("actions")].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${t.bd}`, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: t.mt, whiteSpace: "nowrap", fontFamily: sf }}>{h}</th>)}</tr></thead>
                  <tbody>{filteredTasks.map((tk) => { const pr = PRIOS.find((p) => p.k === tk.priority) || PRIOS[2]; return (
                    <tr key={tk.id} style={{ borderBottom: `1px solid ${t.bd}`, opacity: tk.done ? .5 : 1 }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, textDecoration: tk.done ? "line-through" : "none", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.name}{tk.subtasks?.length > 0 && <span style={{ fontSize: 10, color: t.mt, marginLeft: 4 }}>({tk.subtasks.filter((s) => s.done).length}/{tk.subtasks.length})</span>}</td>
                      <td style={{ padding: "10px 12px" }}><select value={tk.priority || "P2"} onChange={(e) => setTasks((p) => p.map((x) => (x.id === tk.id ? { ...x, priority: e.target.value } : x)))} style={{ ...pill(pr.c), cursor: "pointer", border: `1.5px solid ${pr.c}30`, appearance: "none", WebkitAppearance: "none", paddingRight: 18, backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 5px center" }}>{PRIOS.map((p) => <option key={p.k} value={p.k}>{p.k}</option>)}</select></td>
                      <td style={{ padding: "10px 12px" }}><select value={tk.status || "todo"} onChange={(e) => chgStatus(tk.id, e.target.value)} style={{ fontSize: 11, fontFamily: sf, fontWeight: 600, background: `${STC[tk.status || "todo"]}18`, color: STC[tk.status || "todo"], border: `1.5px solid ${STC[tk.status || "todo"]}30`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", appearance: "none", WebkitAppearance: "none", paddingRight: 20, backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 5px center" }}>{STS.map((s) => <option key={s} value={s}>{STL[s]}</option>)}</select></td>
                      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 36, height: 4, borderRadius: 2, background: t.bd, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: tk.done ? G : tk.running ? Y : t.mt, width: `${(tk.totalSeconds || tk.minutes * 60) > 0 ? (((tk.totalSeconds || tk.minutes * 60) - tk.remaining) / (tk.totalSeconds || tk.minutes * 60)) * 100 : 0}%` }} /></div><span style={{ fontFamily: sm, fontSize: 11, color: tk.running ? Y : t.fg }}>{fmt(tk.remaining)}</span></div></td>
                      <td style={{ padding: "10px 12px" }}><input type="date" value={tk.dueDate || ""} onChange={(e) => setTasks((p) => p.map((x) => (x.id === tk.id ? { ...x, dueDate: e.target.value } : x)))} style={{ border: `1px solid ${t.bd}`, borderRadius: 5, background: t.inp, color: t.fg, fontFamily: sf, fontSize: 10, padding: "2px 4px" }} /></td>
                      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{(tk.tags || []).map((tg, i) => <span key={i} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: `${TC[i % TC.length]}15`, color: TC[i % TC.length], fontFamily: sf }}>{tg}</span>)}</div></td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: tk.assignee ? t.fg : t.mt }}>{tk.assignee ? `@${tk.assignee}` : "—"}</td>
                      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 4 }}>{!tk.done && !tk.running && <button onClick={() => play(tk.id)} style={{ ...tB(t), width: 24, height: 24, background: `${G}18`, color: G }}><PlayI s={10} /></button>}{tk.running && <button onClick={() => pause(tk.id)} style={{ ...tB(t), width: 24, height: 24, background: `${Y}18`, color: Y }}>❚</button>}{!tk.done && <button onClick={() => markDone(tk.id)} style={{ ...tB(t), width: 24, height: 24, background: `${G}18`, color: G }}>✓</button>}<button onClick={() => resetT(tk.id)} style={{ ...tB(t), width: 24, height: 24 }}><ResetI s={10} /></button><button onClick={() => removeT(tk.id)} style={{ ...tB(t), width: 24, height: 24 }}><Trash s={10} /></button></div></td>
                    </tr>
                  ); })}</tbody>
                </table>
              </div>}
            </div>}

            {/* ═══ CALENDAR ═══ */}
            {view === "calendar" && <CalendarView tasks={tasks} onCreateTask={createCalTask} onSchedule={scheduleTask} onUnschedule={unscheduleTask} onRemoveTask={removeT} play={play} pause={pause} markDone={markDone} t={t} T={T} />}

            {/* ═══ GALLERY ═══ */}
            {view === "gallery" && <GalleryView docs={docs} setAD={(id) => { setActiveDoc(id); addRecent(id); }} setV={setView} onAddDoc={addBlankDoc} t={t} T={T} />}

            {/* ═══ DOCS ═══ */}
            {view === "docs" && <div className="fi">
              {!currentDoc
                ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
                    <div className="glass-bar" style={{ textAlign: "center", padding: "40px 48px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 380 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>📄</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 6, letterSpacing: "-0.02em" }}>{T("documentation")}</div>
                      <div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 18 }}>{T("selectDocOrTemplate")}</div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <button onClick={() => setTemplateOpen(true)} className="glass-btn" style={{ height: 34, padding: "0 16px", borderRadius: 10, border: "none", background: R, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, boxShadow: `0 2px 8px ${R}40` }}>✦ {T("template")}</button>
                        <button onClick={addBlankDoc} className="glass-btn" style={{ height: 34, padding: "0 16px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><Plus s={12} />{T("blank")}</button>
                        <button onClick={() => importRef.current?.click()} className="glass-btn" style={{ height: 34, padding: "0 16px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><UpI s={12} />{T("importMd")}</button>
                      </div>
                    </div>
                  </div>
                : <div>
                    {/* Breadcrumbs */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{getBc(currentDoc.id).map((bc, i, arr) => <span key={bc.id} style={{ display: "flex", alignItems: "center", gap: 6 }}><button onClick={() => { if (bc.type === "doc") { setActiveDoc(bc.id); addRecent(bc.id); } }} style={{ border: "none", background: "transparent", color: i === arr.length - 1 ? t.fg : t.mt, cursor: bc.type === "doc" ? "pointer" : "default", fontFamily: sf, fontSize: 12, fontWeight: i === arr.length - 1 ? 600 : 400, padding: 0, letterSpacing: "-0.01em" }}>{bc.type === "folder" ? "📁" : (bc.icon || "📄")} {bc.name}</button>{i < arr.length - 1 && <span style={{ color: t.mt, fontSize: 9, opacity: 0.4 }}>/</span>}</span>)}</div>
                    {/* Cover */}
                    {currentDoc.cover && <div className="glass-cover" style={{ height: 160, borderRadius: 18, marginBottom: -40, background: currentDoc.cover, boxShadow: "0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)" }}>
                      {editingDoc && <button className="glass-btn" onClick={() => updateDoc(currentDoc.id, { cover: null })} style={{ position: "absolute", top: 10, right: 10, zIndex: 2, width: 28, height: 28, borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "rgba(0,0,0,.35)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><XI s={10} /></button>}
                    </div>}
                    {/* Icon + Title — Liquid Glass */}
                    <div className="glass-bar" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8, position: "relative", zIndex: 1, padding: "10px 20px 10px 12px", borderRadius: 22, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 20px rgba(0,0,0,.1)", maxWidth: "100%" }}>
                      <span style={{ fontSize: 32, cursor: "pointer", display: "block", lineHeight: 1, userSelect: "none", transition: "transform .2s cubic-bezier(.4,0,.2,1)", flexShrink: 0 }} onClick={() => { const next = ICONS[(ICONS.indexOf(currentDoc.icon) + 1) % ICONS.length]; updateDoc(currentDoc.id, { icon: next }); }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15) rotate(-4deg)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}>{currentDoc.icon || "📄"}</span>
                      <input value={currentDoc.name} onChange={(e) => updateDoc(currentDoc.id, { name: e.target.value })} size={Math.max(1, currentDoc.name?.length || 1)} style={{ width: `${Math.max(2, (currentDoc.name?.length || 1)) + 1}ch`, minWidth: "2ch", fontSize: 22, fontWeight: 700, letterSpacing: "-0.035em", border: "none", background: "transparent", color: t.fg, fontFamily: sf, outline: "none" }} />
                    </div>
                    {/* Toolbar — Liquid Glass */}
                    <div className="glass-bar" style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 20, flexWrap: "wrap", padding: "8px 10px", borderRadius: 14, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                      <button className="glass-btn" onClick={handleGen} disabled={generating || !currentDoc.content} style={{ height: 30, padding: "0 12px", borderRadius: 10, border: "none", background: generating ? `${R}18` : R, color: generating ? `${R}80` : "#fff", cursor: generating ? "wait" : "pointer", fontFamily: sf, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", boxShadow: generating ? "none" : "0 2px 8px rgba(214,50,48,.25)" }}>{generating ? <div style={{ width: 11, height: 11, border: `2px solid ${R}44`, borderTopColor: R, borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : <Sparkle s={11} />}{generating ? "…" : T("tasks")}</button>
                      <div style={{ width: 1, height: 18, background: t.glassBd, margin: "0 3px" }} />
                      <button className="glass-btn" onClick={() => { if (editingDoc) saveHistory(); setEditingDoc(!editingDoc); }} style={{ height: 30, padding: "0 12px", borderRadius: 10, border: `1px solid ${editingDoc ? "transparent" : t.glassBd}`, background: editingDoc ? t.fg : t.glassHi, color: editingDoc ? t.bg : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600 }}>{editingDoc ? T("preview") : T("edit")}</button>
                      <button className="glass-btn" onClick={() => setHistoryOpen(true)} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: sf }}><HistI s={10} />{T("history")}</button>
                      <button className="glass-btn" onClick={() => toggleFav(currentDoc.id)} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${favs.includes(currentDoc.id) ? `${Y}50` : t.glassBd}`, background: favs.includes(currentDoc.id) ? `${Y}15` : t.glassHi, color: favs.includes(currentDoc.id) ? Y : t.mt, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: sf }}><Star s={10} c={favs.includes(currentDoc.id) ? Y : t.mt} />{T("fav")}</button>
                      {!currentDoc.cover && <button className="glass-btn" onClick={() => updateDoc(currentDoc.id, { cover: COVERS[Math.floor(Math.random() * COVERS.length)] })} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", fontSize: 10, fontFamily: sf }}>🖼 {T("cover")}</button>}
                      <button className="glass-btn" onClick={duplicateDoc} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: sf }}><CopyI s={10} />{T("duplicate")}</button>
                      <button className="glass-btn" onClick={exportDoc} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: t.mt, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: sf }}><DlI s={10} />.md</button>
                      <div style={{ flex: 1 }} />
                      <button className="glass-btn" onClick={deleteDoc} style={{ height: 30, padding: "0 10px", borderRadius: 10, border: `1px solid ${R}18`, background: `${R}08`, color: `${R}99`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: sf }} onMouseEnter={(e) => { e.currentTarget.style.background = `${R}14`; e.currentTarget.style.color = R; }} onMouseLeave={(e) => { e.currentTarget.style.background = `${R}08`; e.currentTarget.style.color = `${R}99`; }}><Trash s={10} />{T("delete")}</button>
                    </div>
                    {/* Relations */}
                    {currentDoc.relatedTasks?.length > 0 && <div style={{ marginBottom: 12, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 10, color: t.mt, fontFamily: sf }}>{T("relatedTasks")}</span>{currentDoc.relatedTasks.map((tid) => { const tk = tasks.find((x) => x.id === tid); return tk ? <span key={tid} style={{ ...pill(B), fontSize: 9, border: "none" }}>⏱ {tk.name}</span> : null; })}</div>}
                    {/* Editor / Preview */}
                    {editingDoc
                      ? <div>
                          <div style={{ fontSize: 10, color: t.mt, marginBottom: 6, fontFamily: sf }}>{T("typeSlash")} <span style={{ color: R, fontWeight: 600 }}>/</span> {T("forCommands")} · <span style={{ color: B }}>{T("wikiLinks")}</span> · Ctrl+Z {T("undo")} · Ctrl+Y {T("redo")}</div>
                          <textarea ref={edRef} value={currentDoc.content || ""} onChange={handleEdInput} onKeyDown={handleEdKey} placeholder={T("startWriting")} style={{ width: "100%", minHeight: 440, borderRadius: 12, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: 18, fontFamily: sf, fontSize: 13, lineHeight: 1.8, resize: "vertical" }} />
                        </div>
                      : <div style={{ lineHeight: 1.75, minHeight: 280 }}>{renderMd(currentDoc.content)}</div>}
                    {!editingDoc && currentDoc.content && (
                      <div className="glass-bar" style={{ marginTop: 28, padding: "16px 20px", borderRadius: 16, border: `1px solid ${t.glassBd}`, background: t.glass, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                        <div><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, fontFamily: sf, letterSpacing: "-0.02em" }}>{T("readyToExecute")}</div><div style={{ fontSize: 11, color: t.mt, fontFamily: sf }}>{T("generateTimedTasks")}</div></div>
                        <button className="glass-btn" onClick={handleGen} disabled={generating} style={{ height: 36, padding: "0 16px", borderRadius: 12, border: "none", background: R, color: "#fff", cursor: generating ? "wait" : "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, boxShadow: "0 2px 8px rgba(214,50,48,.25)" }}>{generating ? <div style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : <Sparkle s={12} />}{generating ? "…" : T("createTasks")}</button>
                      </div>
                    )}
                  </div>}
            </div>}

          </div>
        </div>
      </div>
    </div>
  );
}
