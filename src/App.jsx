import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";

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
  MicI, SkipI, EditI, ExportI, ImportI, GearI,
  VolumeI, VolMuteI,
} from "./components/icons";

/* ── UI primitives ── */
import { tB, sB, pill } from "./components/ui/styles";
import Ring from "./components/ui/Ring";
import Toasts from "./components/ui/Toasts";
import FilterBar from "./components/ui/FilterBar";
import SubTaskInput from "./components/ui/SubTaskInput";

/* ── Markdown ── */
import useMd from "./hooks/useMd";

/* ── Lazy-loaded modals & views ── */
const SearchModal = lazy(() => import("./components/modals/SearchModal"));
const TaskPreview = lazy(() => import("./components/modals/TaskPreview"));
const TrashModal = lazy(() => import("./components/modals/TrashModal"));
const SlashMenu = lazy(() => import("./components/modals/SlashMenu"));
const HelpModal = lazy(() => import("./components/modals/HelpModal"));
const AiSetupModal = lazy(() => import("./components/modals/AiSetupModal"));
const AiWriteModal = lazy(() => import("./components/modals/AiWriteModal"));
const TimerEditModal = lazy(() => import("./components/modals/TimerEditModal"));
const SettingsModal = lazy(() => import("./components/modals/SettingsModal"));
const CalendarView = lazy(() => import("./components/views/CalendarView"));
const GalleryView = lazy(() => import("./components/views/GalleryView"));
import DocTree from "./components/views/DocTree";

/* ── Services ── */
import { genTasks, genContent, transcribeAudio, setGroqKey, getGroqKey } from "./services/ai";
import { db } from "./services/db";
import * as fs from "./services/filesystem";

/* ═══════════════════════════════════════════════════
   ██████  MAIN APP  ██████
   ═══════════════════════════════════════════════════ */
export default function App() {
  const [dk, setDk] = useState(true);
  const t = mkT(dk);
  const [lang, setLang] = useState("en");
  const T = useT(lang);
  const STL = useMemo(() => ({ todo: T("toDo"), progress: T("inProgress"), done: T("done") }), [T]);
  const [sbMode, setSbMode] = useState(() => window.innerWidth > 768 ? "open" : "mini");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => {
      const mob = window.innerWidth <= 768;
      setIsMobile(mob);
      if (mob) setSbMode((m) => m === "open" ? "mini" : m);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMini = sbMode === "mini";
  const sbW = sbMode === "open" ? 256 : sbMode === "mini" ? 52 : 0;
  const toggleSb = () => setSbMode((m) => m === "open" ? "mini" : "open");
  const selectView = (v) => { setView(v); if (isMobile) setSbMode("mini"); };
  const [view, setView] = useState("timers");
  const [searchOpen, setSearchOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);
  const [volPopOpen, setVolPopOpen] = useState(false);
  const volPopRef = useRef(null);
  useEffect(() => {
    if (!volPopOpen) return;
    const h = (e) => { if (volPopRef.current && !volPopRef.current.contains(e.target)) setVolPopOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [volPopOpen]);
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
  const filterTasks = (list) => {
    let r = list;
    if (filters.priority) r = r.filter((tk) => tk.priority === filters.priority);
    if (filters.status) r = r.filter((tk) => (tk.status || "todo") === filters.status);
    if (filters.tag) r = r.filter((tk) => (tk.tags || []).some((tg) => tg.toLowerCase().includes(filters.tag.toLowerCase())));
    return r;
  };

  /* KEYBOARD */
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) { e.preventDefault(); setSearchOpen(true); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "h" || e.key === "H")) { e.preventDefault(); setHelpOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setHelpOpen(false); setSettingsOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ═══════ TASKS ═══════ */
  const mkTask = (name, min, prio = "P2", tags = [], assignee = "", fromDoc = null, dueDate = "", extraSec = 0, opts = {}) => {
    const totalSec = min * 60 + extraSec;
    return {
      id: uid(), name, minutes: min, seconds: extraSec, totalSeconds: totalSec, remaining: totalSec, running: false, done: false, fromDoc,
      priority: prio, tags, assignee, dueDate, dueTime: "", status: "todo", subtasks: [], relatedDocs: [], reminder: null,
      endAction: opts.endAction || "stop", soundOnEnd: opts.soundOnEnd !== false,
      isBreak: opts.isBreak || false,
    };
  };
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nN, setNN] = useState(""); const [nM, setNM] = useState(10); const [nS, setNS] = useState(0); const [nP, setNP] = useState("P2");
  const [nT, setNT] = useState(""); const [nA, setNA] = useState(""); const [nD, setND] = useState("");
  const ivs = useRef({});
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [volume, setVolume] = useState(0.5);
  const volumeRef = useRef(0.5);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  /* ── Auto-advance ── */
  const [autoAdvance, setAutoAdvance] = useState(false);
  const autoAdvanceRef = useRef(false);
  const [autoAdvanceTrigger, setAutoAdvanceTrigger] = useState(0);
  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);

  /* ── Timer edit modal ── */
  const [editingTask, setEditingTask] = useState(null);

  /* ── Workspace / Filesystem ── */
  const [storageMode, setStorageMode] = useState("session"); // "session" | "disk"
  const [fsFolderName, setFsFolderName] = useState(null);

  /* ── Voice dictation (inline panel via /iavoz) — MediaRecorder + Groq Whisper ── */
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recordSecs, setRecordSecs] = useState(0);
  const recTimerRef = useRef(null);
  const [dictPanel, setDictPanel] = useState({ open: false, transcript: "", transcribing: false, stopped: false, processing: false, docType: "" });

  /* ── Microbreak setting ── */
  const [includeBreaks, setIncludeBreaks] = useState(true);

  /* ── Settings extras ── */
  const [tickEnabled, setTickEnabled] = useState(true);
  const tickEnabledRef = useRef(true);
  useEffect(() => { tickEnabledRef.current = tickEnabled; }, [tickEnabled]);
  const [transcriptionLang, setTranscriptionLang] = useState("auto");

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
      return ctx;
    } catch (_) { return null; }
  }, []);

  /* Start sound — ascending two-note chime */
  const playStartSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const v = volumeRef.current;
    const t0 = ctx.currentTime;
    [440, 554.37].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25 * v, t0 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5 + i * 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0 + i * 0.12);
      osc.stop(t0 + 0.6 + i * 0.12);
    });
  }, [getAudioCtx]);

  /* Tick sound — metronome click each second */
  const playTickSound = useCallback(() => {
    if (mutedRef.current || !tickEnabledRef.current) return;
    const ctx = getAudioCtx(); if (!ctx || ctx.state !== "running") return;
    const v = volumeRef.current;
    const t0 = ctx.currentTime;
    /* Wood-block metronome: short noise burst filtered to a click */
    const bufLen = Math.floor(ctx.sampleRate * 0.015);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.15));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3500;
    bp.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35 * v, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  }, [getAudioCtx]);

  /* Completion sound — triumphant chord */
  const playDoneSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx(); if (!ctx) return;
    const v = volumeRef.current;
    const t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.45 * v, t0 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2 + i * 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0 + i * 0.1);
      osc.stop(t0 + 1.4 + i * 0.1);
    });
  }, [getAudioCtx]);

  const tick = useCallback((id) => {
    let justFinished = false;
    let taskEndAction = "stop";
    setTasks((p) => p.map((x) => {
      if (x.id !== id) return x;
      if (x.remaining <= 1) {
        clearInterval(ivs.current[id]); delete ivs.current[id]; playDoneSound(); justFinished = true;
        taskEndAction = x.endAction || "stop";
        return { ...x, remaining: 0, running: false, done: true, status: "done" };
      }
      if (x.reminder && !x.reminder.triggered && x.remaining <= x.reminder.minutes * 60) {
        notify(`⏰ Reminder: ${x.name} — ${x.reminder.minutes}m left`, "⏰");
        playTickSound();
        return { ...x, remaining: x.remaining - 1, reminder: { ...x.reminder, triggered: true } };
      }
      playTickSound();
      return { ...x, remaining: x.remaining - 1 };
    }));
    if (justFinished) {
      if (taskEndAction === "repeat") {
        setTimeout(() => { resetT(id); setTimeout(() => play(id), 300); }, 800);
      } else if (taskEndAction === "next" || autoAdvanceRef.current) {
        setTimeout(() => setAutoAdvanceTrigger((c) => c + 1), 1200);
      }
    }
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

  /* ── Auto-advance effect ── */
  useEffect(() => {
    if (autoAdvanceTrigger === 0) return;
    const next = tasks.find((x) => !x.done && !x.running && x.remaining > 0);
    if (next) {
      play(next.id);
      notify(`⏭️ ${next.name}`, "⏭️");
    } else {
      notify(T("allTasksDone"), "🏁");
    }
  }, [autoAdvanceTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Timer edit handler ── */
  const saveTimerEdit = (id, updates) => {
    setTasks((p) => p.map((x) => (x.id === id ? { ...x, ...updates } : x)));
  };

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
  const [slashHi, setSlashHi] = useState(0);
  const slashIdx = useRef(-1); /* char index where '/' was typed */
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
  const deleteDocById = (id) => { 
    const doc = allDocs.find(d => d.id === id); 
    if (!doc) return; 
    toTrash(doc, "doc"); 
    const f = (ns) => ns.filter((n) => n.id !== id).map((n) => ({ ...n, children: n.children ? f(n.children) : n.children })); 
    setDocs(f(docs)); 
    if (currentDoc?.id === id) setActiveDoc(null); 
    notify(T("movedToTrash"), "🗑️"); 
  };
  const allDocs = useMemo(() => { const r = []; const w = (ns) => ns.forEach((n) => { if (n.type === "doc") r.push(n); if (n.children) w(n.children); }); w(docs); return r; }, [docs]);
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
  const confirmAi = () => {
    if (!aiPreview) return;
    const selected = aiPreview.tasks.filter((x) => x.selected);
    let nt = [];
    if (includeBreaks) {
      let blockCount = 0;
      selected.forEach((s, i) => {
        nt.push(mkTask(s.name, s.minutes, s.priority || "P2", s.tags || [], "", aiPreview.docName));
        blockCount++;
        if (i < selected.length - 1) {
          if (blockCount % 3 === 0) {
            nt.push(mkTask(`☕ ${T("longBreak")}`, 15, "P3", ["break"], "", null, "", 0, { isBreak: true, endAction: "next" }));
          } else {
            nt.push(mkTask(`🧘 ${T("microbreak")}`, 5, "P3", ["break"], "", null, "", 0, { isBreak: true, endAction: "next" }));
          }
        }
      });
    } else {
      nt = selected.map((s) => mkTask(s.name, s.minutes, s.priority || "P2", s.tags || [], "", aiPreview.docName));
    }
    setTasks((p) => [...p, ...nt]);
    setAiP(null);
    setView("timers");
    const breakCount = nt.filter((x) => x.isBreak).length;
    const msg = includeBreaks && breakCount > 0
      ? `${selected.length} ${T("tasksCreated")} + ${breakCount} ${T("breaksInserted")}`
      : `${selected.length} ${T("tasksCreated")}`;
    notify(msg, "✨");
  };

  const saveHistory = () => { if (!currentDoc) return; updateDoc(currentDoc.id, { history: [...(currentDoc.history || []).slice(-19), { date: now(), content: currentDoc.content || "" }] }); };

  const renderMd = useMd(t, docs, (id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }, setView, T);

  /* Caret pixel position inside textarea */
  const getCaretXY = (ta) => {
    const cs = getComputedStyle(ta);
    const m = document.createElement("div");
    const props = ["fontFamily","fontSize","fontWeight","letterSpacing","lineHeight","padding","border","boxSizing","whiteSpace","wordWrap","overflowWrap","tabSize","textIndent","textTransform"];
    props.forEach((p) => (m.style[p] = cs[p]));
    m.style.position = "absolute"; m.style.visibility = "hidden"; m.style.whiteSpace = "pre-wrap"; m.style.wordWrap = "break-word";
    m.style.width = ta.offsetWidth + "px"; m.style.height = "auto"; m.style.overflow = "hidden";
    const pos = ta.selectionStart;
    const txt = ta.value.substring(0, pos);
    m.textContent = txt;
    const sp = document.createElement("span"); sp.textContent = "|"; m.appendChild(sp);
    document.body.appendChild(m);
    const rect = ta.getBoundingClientRect();
    const x = rect.left + sp.offsetLeft - ta.scrollLeft;
    const y = rect.top + sp.offsetTop - ta.scrollTop;
    document.body.removeChild(m);
    return { x, y };
  };

  /* Slash */
  const slashItems = useRef([]);
  const handleEdKey = (e) => {
    /* Ctrl/Cmd + Enter → exit edit, show preview */
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (editingDoc) { saveHistory(); setEditingDoc(false); } return; }
    if (e.key === "/" && !slashOpen) { const { x, y } = getCaretXY(e.target); setSlashPos({ x: Math.min(x, window.innerWidth - 240), y: Math.min(y + 20, window.innerHeight - 280) }); slashIdx.current = e.target.selectionStart; setSlashOpen(true); setSlashQ(""); setSlashHi(0); }
    else if (slashOpen) {
      if (e.key === "Escape") { setSlashOpen(false); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSlashHi((p) => { const len = slashItems.current.length || 1; return (p + 1) % len; }); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSlashHi((p) => { const len = slashItems.current.length || 1; return (p - 1 + len) % len; }); }
      else if (e.key === "Enter") { e.preventDefault(); const items = slashItems.current; if (items.length) handleSlashSel(items[slashHi] || items[0]); }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); if (undoStack.length) { const prev = undoStack[undoStack.length - 1]; setRedo((p) => [...p, currentDoc?.content || ""]); setUndo((p) => p.slice(0, -1)); if (currentDoc) updateDoc(currentDoc.id, { content: prev }); } }
    if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); if (redoStack.length) { const next = redoStack[redoStack.length - 1]; setUndo((p) => [...p, currentDoc?.content || ""]); setRedo((p) => p.slice(0, -1)); if (currentDoc) updateDoc(currentDoc.id, { content: next }); } }
  };
  const handleEdInput = (e) => { const v = e.target.value; pushUndo(currentDoc?.content || ""); updateDoc(currentDoc.id, { content: v }); if (slashOpen) { const si = slashIdx.current; if (si >= 0 && v[si] === "/") { const q = v.slice(si + 1).split("\n")[0]; setSlashQ(q); setSlashHi(0); } else { setSlashOpen(false); } } };
  const handleSlashSel = (cmd) => {
    if (!currentDoc) return;
    const c = currentDoc.content || ""; const si = slashIdx.current; const before = si >= 0 ? c.slice(0, si) : c; const after = si >= 0 ? c.slice(si + 1 + slashQ.length) : "";
    if (cmd.voice) {
      // Remove the slash text first then start dictation panel
      updateDoc(currentDoc.id, { content: before + after });
      setSlashOpen(false);
      startDictation();
      return;
    }
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
  const openSlashMenu = () => {
    const ta = edRef.current; if (!ta || !currentDoc) return;
    ta.focus();
    const pos = ta.selectionStart ?? (currentDoc.content || "").length;
    const c = currentDoc.content || "";
    const before = c.slice(0, pos), after = c.slice(pos);
    updateDoc(currentDoc.id, { content: before + "/" + after });
    slashIdx.current = pos;
    setSlashPos({ x: Math.min(40, window.innerWidth - 240), y: Math.min(window.innerHeight - 340, 200) });
    setSlashOpen(true); setSlashQ(""); setSlashHi(0);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos + 1; });
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

  /* ── Workspace: Filesystem ── */
  const handlePickFolder = async () => {
    if (!fs.isSupported()) { notify(T("fsNotSupported"), "⚠️"); return; }
    const name = await fs.pickFolder();
    if (name) {
      setFsFolderName(name);
      setStorageMode("disk");
      notify(`📁 ${name}`, "✅");
      // Immediate first save so files appear right away
      const slug = userName?.toLowerCase().replace(/\s+/g, "-") || "default";
      const settings = { userName, userRole, dk, lang, favs, recent, autoAdvance, includeBreaks };
      const project = { tasks, docs, settings };
      const ok = await fs.saveProject(slug, "", project);
      if (!ok) { setStorageMode("session"); setFsFolderName(null); notify(T("fsPermDenied"), "⚠️"); }
    }
  };

  /* ── Export / Import project ── */
  const exportProject = () => {
    const bundle = fs.exportProjectBundle(tasks, docs, { userName, userRole, darkMode: dk, lang, favs, recent, autoAdvance, includeBreaks });
    downloadFile("eterorg-project.json", bundle, "application/json");
    notify(T("projectExported"), "📦");
  };
  const importProjectRef = useRef(null);

  const handleImportProject = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = fs.parseImportBundle(e.target.result);
      if (!data) { notify(T("importError"), "⚠️"); return; }
      // Import with new IDs to avoid collisions
      const idMap = {};
      const newTasks = (data.tasks || []).map((t) => { const newId = uid(); idMap[t.id] = newId; return { ...t, id: newId, running: false }; });
      const remapDocs = (nodes) => nodes.map((n) => { const newId = uid(); idMap[n.id] = newId; return { ...n, id: newId, children: n.children ? remapDocs(n.children) : n.children }; });
      const newDocs = remapDocs(data.docs || []);
      setTasks((p) => [...p, ...newTasks]);
      setDocs((p) => [...p, ...newDocs]);
      notify(T("projectImported"), "📦");
    };
    reader.readAsText(file);
  };

  /* ── Voice dictation (/iavoz) — MediaRecorder + Groq Whisper ── */
  const startDictation = async () => {
    if (!getGroqKey()) { setAiSetup(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop any existing recorder
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop();
      }
      audioChunksRef.current = [];
      setRecordSecs(0);
      setDictPanel({ open: true, transcript: "", transcribing: false, stopped: false, processing: false, docType: "" });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimerRef.current);
        if (audioChunksRef.current.length === 0) {
          setDictPanel((p) => ({ ...p, stopped: true }));
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setDictPanel((p) => ({ ...p, transcribing: true }));
        const result = await transcribeAudio(blob, lang);
        if (result.error === "NO_KEY") { closeDictPanel(); setAiSetup(true); return; }
        if (result.error) { notify(T("whisperError"), "⚠️"); setDictPanel((p) => ({ ...p, transcribing: false, stopped: true })); return; }
        setDictPanel((p) => ({ ...p, transcript: result.text || "", transcribing: false, stopped: true }));
      };
      recorder.start(1000); // collect chunks every 1s
      mediaRecRef.current = recorder;
      setIsRecording(true);
      recTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
      notify(T("recording"), "🎙️");
    } catch (e) {
      console.error("Mic error:", e);
      notify(T("micPermDenied"), "⚠️");
    }
  };
  const stopDictation = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recTimerRef.current);
  };
  const closeDictPanel = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recTimerRef.current);
    setDictPanel({ open: false, transcript: "", transcribing: false, stopped: false, processing: false, docType: "" });
  };
  const insertRawTranscript = () => {
    if (!currentDoc || !dictPanel.transcript.trim()) return;
    pushUndo(currentDoc.content || "");
    updateDoc(currentDoc.id, { content: (currentDoc.content || "") + "\n\n" + dictPanel.transcript.trim() });
    closeDictPanel();
    edRef.current?.focus();
    notify("✅", "🎙️");
  };
  const processDictWithAi = async (docType) => {
    if (!currentDoc || !dictPanel.transcript.trim()) return;
    if (!getGroqKey()) { closeDictPanel(); setAiSetup(true); return; }
    setDictPanel((p) => ({ ...p, processing: true, docType }));
    const typePrompts = {
      prd: `Transform the following voice transcription into a well-structured Product Requirements Document (PRD). Use proper markdown with headings, bullet points, tables where appropriate. Organize the ideas logically into sections like Overview, Goals, Scope, Requirements, Timeline, etc.`,
      brainstorm: `Organize the following voice transcription into a structured brainstorm document. Group related ideas together, use bullet lists, highlight key themes, and add any logical connections between ideas.`,
      summary: `Create a concise, structured summary from the following voice transcription. Use clear headings and bullet points to organize the key points.`,
      draft: `Transform the following voice transcription into a well-written draft document. Clean up the language, organize the content logically, and use proper markdown formatting.`,
      free: `Clean up and organize the following voice transcription into a well-structured document. Maintain the original intent and ideas but improve clarity and formatting with markdown.`,
    };
    const prompt = typePrompts[docType] || typePrompts.free;
    const result = await genContent(prompt + "\n\nTranscription:\n" + dictPanel.transcript.trim(), currentDoc.content, lang);
    if (result === "NO_KEY") { closeDictPanel(); setAiSetup(true); return; }
    if (!result) { notify(T("aiWriteError"), "⚠️"); setDictPanel((p) => ({ ...p, processing: false })); return; }
    pushUndo(currentDoc.content || "");
    updateDoc(currentDoc.id, { content: (currentDoc.content || "") + "\n\n" + result });
    closeDictPanel();
    edRef.current?.focus();
    notify("✨ AI", "✦");
  };

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
        if (savedSettings.volume !== undefined) { setVolume(savedSettings.volume); volumeRef.current = savedSettings.volume; }
        if (savedSettings.autoAdvance) setAutoAdvance(true);
        if (savedSettings.includeBreaks !== undefined) setIncludeBreaks(savedSettings.includeBreaks);
        if (savedSettings.tickEnabled !== undefined) setTickEnabled(savedSettings.tickEnabled);
        if (savedSettings.transcriptionLang) setTranscriptionLang(savedSettings.transcriptionLang);
        // Restore filesystem mode
        if (savedSettings.storageMode === "disk") {
          setStorageMode("disk");
          if (savedSettings.fsFolderName) setFsFolderName(savedSettings.fsFolderName);
          // Try to restore the directory handle from IndexedDB
          fs.restoreFolder().then((name) => {
            if (name) {
              setFsFolderName(name);
            } else {
              // Handle couldn't be restored (cleared or browser reset)
              setStorageMode("session");
              setFsFolderName(null);
            }
          });
        }
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
        darkMode: dk, lang, onboarded, favs, recent, muted, volume,
        autoAdvance, includeBreaks, tickEnabled, transcriptionLang,
        storageMode, fsFolderName,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [userName, userRole, dk, lang, onboarded, favs, recent, muted, volume, autoAdvance, includeBreaks, tickEnabled, transcriptionLang, storageMode, fsFolderName, dbReady]);

  // Auto-save to filesystem (when disk mode active)
  useEffect(() => {
    if (!dbReady || storageMode !== "disk" || !fs.hasFolder()) return;
    const timer = setTimeout(async () => {
      const slug = userName?.toLowerCase().replace(/\s+/g, "-") || "default";
      const settings = { userName, userRole, dk, lang, favs, recent, autoAdvance, includeBreaks };
      const project = { tasks, docs, settings };
      const ok = await fs.saveProject(slug, "", project);
      if (!ok) { setStorageMode("session"); setFsFolderName(null); notify(T("fsPermDenied"), "⚠️"); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [tasks, docs, userName, userRole, dk, lang, favs, recent, autoAdvance, includeBreaks, storageMode, dbReady]);

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
    <div style={{ display: "flex", height: "100dvh", background: t.bg, color: t.fg, fontFamily: sf, transition: "background .4s,color .4s", overflow: "hidden" }}>
      {/* Mobile sidebar overlay */}
      {isMobile && sbMode === "open" && <div className="sidebar-overlay" onClick={() => setSbMode("mini")} />}

      <Toasts items={notifs} onDismiss={(id) => setNotifs((p) => p.filter((n) => n.id !== id))} t={t} />
      <Suspense fallback={null}><SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} tasks={tasks} docs={docs} setAD={(id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }} setV={setView} t={t} T={T} /></Suspense>
      {aiPreview && <Suspense fallback={null}><TaskPreview tasks={aiPreview.tasks} docName={aiPreview.docName} t={t} T={T} onCancel={() => setAiP(null)} onConfirm={confirmAi} onToggle={(i) => setAiP((p) => ({ ...p, tasks: p.tasks.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)) }))} onTime={(i, m) => setAiP((p) => ({ ...p, tasks: p.tasks.map((x, j) => (j === i ? { ...x, minutes: m } : x)) }))} /></Suspense>}
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
      {trashOpen && <Suspense fallback={null}><TrashModal trash={trash} onRestore={restoreTrash} onPermanent={permDelete} onClose={() => setTrashOpen(false)} t={t} T={T} /></Suspense>}
      <Suspense fallback={null}><HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} t={t} T={T} /></Suspense>
      <Suspense fallback={null}><AiSetupModal open={aiSetup} onClose={() => setAiSetup(false)} onSave={handleAiKeySave} hasKey={!!getGroqKey()} t={t} T={T} /></Suspense>
      <Suspense fallback={null}><AiWriteModal open={aiWrite.open} mode={aiWrite.mode} onClose={() => setAiWrite({ open: false, mode: "ai" })} onSubmit={handleAiWrite} loading={aiWriting} t={t} T={T} /></Suspense>
      {editingTask && <Suspense fallback={null}><TimerEditModal task={editingTask} onSave={saveTimerEdit} onClose={() => setEditingTask(null)} t={t} T={T} /></Suspense>}
      <Suspense fallback={null}><SettingsModal
        open={settingsOpen} onClose={() => setSettingsOpen(false)} t={t} T={T}
        userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole}
        lang={lang} setLang={setLang} dk={dk} setDk={setDk}
        autoAdvance={autoAdvance} setAutoAdvance={setAutoAdvance}
        includeBreaks={includeBreaks} setIncludeBreaks={setIncludeBreaks}
        muted={muted} setMuted={setMuted} volume={volume} setVolume={setVolume}
        tickEnabled={tickEnabled} setTickEnabled={setTickEnabled}
        storageMode={storageMode} fsFolderName={fsFolderName}
        onPickFolder={handlePickFolder} onExport={exportProject}
        onImport={() => importProjectRef.current?.click()} fsSupported={fs.isSupported()}
        hasApiKey={!!getGroqKey()} onSetApiKey={(k) => { setGroqKey(k); notify(T("apiKeySaved"), "🔑"); }}
        onClearApiKey={() => { setGroqKey(""); notify(T("apiKeyCleared"), "🔑"); }}
        transcriptionLang={transcriptionLang} setTranscriptionLang={setTranscriptionLang}
        onRequestNotifPerm={requestNotifPerm}
        trashCount={trash.length} onEmptyTrash={() => { setTrash([]); notify(T("settingsEmptyTrash"), "🗑️"); }}
        onResetOnboarding={() => { setOnboarded(false); }}
        onClearAllData={async () => { setTasks([]); setDocs([]); setTrash([]); setOnboarded(false); setUserName(""); setUserRole(""); await db.saveSettings({ id: "default" }); await db.saveTasks([]); await db.saveDocs([]); }}
        notify={notify} roles={T("roles")}
      /></Suspense>
      {slashOpen && <Suspense fallback={null}><SlashMenu query={slashQ} onSelect={handleSlashSel} pos={slashPos} t={t} T={T} activeIdx={slashHi} itemsRef={slashItems} /></Suspense>}
      <input ref={importRef} type="file" accept=".md,.txt" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) importDoc(e.target.files[0]); e.target.value = ""; }} />
      <input ref={importProjectRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleImportProject(e.target.files[0]); e.target.value = ""; }} />

      {/* ═══ SIDEBAR ═══ */}
      <div className={isMobile && sbMode === "open" ? "sidebar-mobile safe-top" : "safe-top"} style={{ width: sbW, minWidth: sbW, background: t.sb, borderRight: sbMode !== "closed" ? `1px solid ${t.bd}` : "none", display: "flex", flexDirection: "column", transition: "all .25s cubic-bezier(.4,0,.2,1)", overflow: "hidden" }}>
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
            <STab icon={<TimerI s={13} />} label={T("timers")} active={view === "timers"} onClick={() => selectView("timers")} badge={tasks.filter((x) => x.running).length} />
            <STab icon={<Board s={13} />} label={T("board")} active={view === "board"} onClick={() => selectView("board")} />
            <STab icon={<TableI s={13} />} label={T("table")} active={view === "table"} onClick={() => selectView("table")} />
            <STab icon={<CalI s={13} />} label={T("calendar")} active={view === "calendar"} onClick={() => selectView("calendar")} />
            <STab icon={<GallI s={13} />} label={T("gallery")} active={view === "gallery"} onClick={() => selectView("gallery")} />
            <STab icon={<FileT s={13} />} label={T("docs")} active={view === "docs"} onClick={() => selectView("docs")} />
          </div>
        </div>
        {!isMini && <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
          {favDocs.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf, display: "flex", alignItems: "center", gap: 4 }}><Star s={8} c={Y} /> {T("favorites")}</div>{favDocs.map((d) => <button key={d.id} onClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(false); addRecent(d.id); }} onDoubleClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(true); addRecent(d.id); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 10px", borderRadius: 6, border: "none", background: activeDoc === d.id ? t.at : "transparent", color: activeDoc === d.id ? t.fg : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, textAlign: "left" }}><span style={{ fontSize: 10 }}>{d.icon || "📄"}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span></button>)}</div>}
          {recentDocs.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>⏱ {T("recent")}</div>{recentDocs.slice(0, 4).map((d) => <button key={d.id} onClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(false); }} onDoubleClick={() => { setActiveDoc(d.id); setView("docs"); setEditingDoc(true); addRecent(d.id); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 10px", borderRadius: 6, border: "none", background: "transparent", color: t.mt, cursor: "pointer", fontFamily: sf, fontSize: 12, textAlign: "left" }}><span style={{ fontSize: 10 }}>{d.icon || "📄"}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span></button>)}</div>}
          {(view === "timers" || view === "board" || view === "table" || view === "calendar") && <div><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>{T("tasks")} · {tasks.filter((x) => x.done).length}/{tasks.length}</div>{tasks.slice(0, 15).map((tk) => <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, fontSize: 12, color: tk.done ? t.mt : t.fg, textDecoration: tk.done ? "line-through" : "none" }}><div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: tk.done ? G : tk.running ? Y : t.bd, animation: tk.running ? "pulse 2s infinite" : "none" }} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.name}</span><span style={{ fontSize: 10, fontFamily: sf, color: t.mt, flexShrink: 0 }}>{fmt(tk.remaining)}</span></div>)}</div>}
          {view === "docs" && <div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", marginBottom: 2 }}><span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, fontFamily: sf }}>{T("documents")}</span><div style={{ display: "flex", gap: 2 }}><button onClick={addBlankDoc} style={{ ...tB(t), width: 18, height: 18 }}><Plus s={9} /></button><button onClick={addRootFolder} style={{ ...tB(t), width: 18, height: 18 }}><Fold s={8} /></button><button onClick={() => setTemplateOpen(true)} style={{ ...tB(t), width: 18, height: 18 }} title="Template">✦</button><button onClick={() => importRef.current?.click()} style={{ ...tB(t), width: 18, height: 18 }} title="Import .md"><UpI s={8} /></button></div></div>{docs.map((n) => <DocTree key={n.id} node={n} depth={0} activeDoc={activeDoc} setAD={(id) => { setActiveDoc(id); setEditingDoc(false); addRecent(id); }} onEditDoc={(id) => { setActiveDoc(id); setEditingDoc(true); addRecent(id); }} docs={docs} setDocs={setDocs} t={t} favs={favs} toggleFav={toggleFav} drag={drag} setDrag={setDrag} />)}</div>}
          {view === "gallery" && <div><div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: t.mt, padding: "4px 8px", fontFamily: sf }}>{T("documents")}</div></div>}
        </div>}
        {isMini && <div style={{ flex: 1 }} />}
        <div style={{ padding: isMini ? "8px 4px" : "8px 12px", borderTop: `1px solid ${t.bd}` }}>
          <div style={{ display: "flex", flexDirection: isMini ? "column" : "row", alignItems: "center", justifyContent: isMini ? "center" : "space-between", gap: isMini ? 4 : 0 }}>
            <div style={{ display: "flex", flexDirection: isMini ? "column" : "row", gap: 4, alignItems: "center" }}>
              <button onClick={() => setTrashOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("trash")}><Trash s={10} /></button>
              <button onClick={() => setSearchOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("helpShortcutSearch")}><SearchI s={10} /></button>
              <button onClick={() => setHelpOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("helpShortcutHelp")}><HelpI s={10} /></button>
              <div ref={volPopRef} style={{ position: "relative", display: "inline-flex" }}>
                <button onClick={() => setVolPopOpen((p) => !p)} onContextMenu={(e) => { e.preventDefault(); setMuted(!muted); notify(muted ? T("soundOn") : T("soundOff"), muted ? "🔊" : "🔇"); }} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6, color: muted ? R : t.mt, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }} title={muted ? T("soundOn") : T("soundOff")}>{muted ? <VolMuteI s={10} /> : <VolumeI s={10} />}</button>
                {volPopOpen && <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6, background: t.card, border: `1px solid ${t.bd}`, borderRadius: 12, padding: "12px 10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 20px rgba(0,0,0,.18)", zIndex: 50, minWidth: 38 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: t.mt, fontFamily: sf }}>{Math.round(volume * 100)}%</span>
                  <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (v > 0 && muted) setMuted(false); if (v === 0) setMuted(true); }} style={{ writingMode: "vertical-lr", direction: "rtl", width: 4, height: 90, accentColor: B, cursor: "pointer", WebkitAppearance: "slider-vertical" }} />
                  <button onClick={() => { setMuted(!muted); }} style={{ ...tB(t), width: 22, height: 22, borderRadius: 6, color: muted ? R : t.mt, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{muted ? <VolMuteI s={10} /> : <VolumeI s={10} />}</button>
                </div>}
              </div>
              <button onClick={() => setSettingsOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("settings")}><GearI s={10} /></button>
            </div>
            {!isMini && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setLang(lang === "en" ? "es" : "en")} style={{ height: 22, padding: "0 6px", borderRadius: 6, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", fontFamily: sf, fontSize: 9, fontWeight: 600, color: t.fg }}>{lang === "en" ? "ES" : "EN"}</button>
              <button onClick={() => setDk(!dk)} style={{ width: 40, height: 22, borderRadius: 11, border: `1.5px solid ${t.bd}`, background: t.inp, cursor: "pointer", position: "relative", padding: 0 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: t.fg, position: "absolute", top: 1.5, left: dk ? 20 : 1.5, transition: "left .3s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{dk ? <SunI s={8} c={t.bg} /> : <MoonI s={8} c={t.bg} />}</div></button>
            </div>}
            {isMini && <>
              <button onClick={() => setSettingsOpen(true)} style={{ ...tB(t), width: 24, height: 24, borderRadius: 6 }} title={T("settings")}><GearI s={10} /></button>
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
          <div className="safe-top" style={{ padding: isMobile ? "8px 10px" : "8px 16px", borderBottom: `1px solid ${t.bd}`, display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setSbMode("open")} style={sB(t)}><SideI s={14} /></button>
            <h1 style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>eter<span style={{ color: R }}>Org</span></h1>
            <div className="topbar-views">{["timers", "board", "table", "calendar", "gallery", "docs"].map((v) => <button key={v} onClick={() => setView(v)} style={{ height: 26, padding: "0 8px", borderRadius: 6, border: `1px solid ${view === v ? t.fg : t.bd}`, background: view === v ? t.at : "transparent", color: view === v ? t.fg : t.mt, cursor: "pointer", fontSize: 10, fontWeight: 500, fontFamily: sf, textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 }}>{v}</button>)}</div>
            <button onClick={() => setSearchOpen(true)} style={sB(t)}><SearchI s={14} /></button>
            <button onClick={() => setSettingsOpen(true)} style={sB(t)} title={T("settings")}><GearI s={14} /></button>
            <button onClick={() => setDk(!dk)} style={sB(t)}>{dk ? <SunI s={14} /> : <MoonI s={14} />}</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? (view === "board" ? "12px 8px" : "16px 12px") : (view === "board" ? "20px 16px" : "28px 24px"), display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: view === "board" ? 1100 : view === "table" ? 920 : view === "calendar" ? 900 : view === "gallery" ? 900 : 680 }}>

            {/* ═══ TIMERS ═══ */}
            {view === "timers" && <div className="fi">
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, color: t.mt, marginBottom: 3 }}>{greeting}{userName ? `, ${userName}` : ""} 👋</p>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>{T("timers")}</h2>
                <p style={{ fontSize: 11, color: t.mt, marginTop: 4, fontFamily: sf }}>{tasks.filter((x) => x.done).length}/{tasks.length} {T("completed")}</p>
                {/* ── Controls bar ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {/* Auto-advance */}
                  <button onClick={() => setAutoAdvance(!autoAdvance)} title={T("autoAdvanceDesc")} style={{ height: 28, padding: "0 10px", borderRadius: 8, border: autoAdvance ? `1.5px solid ${G}` : `1px solid ${t.bd}`, background: autoAdvance ? `${G}15` : "transparent", color: autoAdvance ? G : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <SkipI s={10} /> {T("autoAdvance")} {autoAdvance ? "ON" : "OFF"}
                  </button>
                  {/* Include breaks */}
                  <button onClick={() => setIncludeBreaks(!includeBreaks)} title={T("breakAfterBlock")} style={{ height: 28, padding: "0 10px", borderRadius: 8, border: includeBreaks ? `1.5px solid ${B}` : `1px solid ${t.bd}`, background: includeBreaks ? `${B}15` : "transparent", color: includeBreaks ? B : t.mt, cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    🧘 {T("includeBreaks")} {includeBreaks ? "ON" : "OFF"}
                  </button>
                  {/* Export / Import */}
                  <button onClick={exportProject} title={T("exportProject")} style={{ ...tB(t), height: 28, padding: "0 8px", borderRadius: 8 }}><ExportI s={10} /></button>
                  <button onClick={() => importProjectRef.current?.click()} title={T("importProject")} style={{ ...tB(t), height: 28, padding: "0 8px", borderRadius: 8 }}><ImportI s={10} /></button>
                </div>
              </div>
              <FilterBar filters={filters} setFilters={setFilters} t={t} T={T} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredTasks.length === 0 && !showAdd && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}><div className="glass-bar" style={{ textAlign: "center", padding: "36px 44px", borderRadius: 24, background: t.glass, border: `1px solid ${t.glassBd}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", maxWidth: 340 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: t.glassHi, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><TimerI s={22} c={t.mt} /></div><div style={{ fontSize: 15, fontWeight: 700, color: t.fg, fontFamily: sf, marginBottom: 5, letterSpacing: "-0.02em" }}>{T("timersEmpty")}</div><div style={{ fontSize: 12, color: t.mt, fontFamily: sf, lineHeight: 1.6, marginBottom: 16 }}>{T("timersEmptyDesc")}</div><button onClick={() => setShowAdd(true)} className="glass-btn" style={{ height: 34, padding: "0 18px", borderRadius: 10, border: "none", background: G, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px ${G}40` }}><Plus s={12} />{T("addTask")}</button></div></div>}
                {filteredTasks.map((task) => { const total = task.totalSeconds || task.minutes * 60, prog = total > 0 ? (total - task.remaining) / total : 0; const pr = PRIOS.find((p) => p.k === task.priority) || PRIOS[2];
                  return (
                    <div key={task.id} className="fi" draggable onDragStart={() => setTaskDrag(task.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (taskDrag && taskDrag !== task.id) reorderT(taskDrag, task.id); setTaskDrag(null); }}
                      style={{ background: t.card, border: `1px solid ${t.bd}`, borderRadius: 14, padding: isMobile ? "14px 12px" : "20px 22px", opacity: task.done ? .5 : 1, position: "relative", overflow: "hidden", cursor: "grab" }}>
                      {task.done && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: G }} />}
                      {task.running && <div style={{ position: "absolute", top: 0, left: 0, width: `${prog * 100}%`, height: 2.5, background: Y, transition: "width 1s linear" }} />}
                      <div className="timer-card-inner">
                        <div className="ring-wrap" style={{ position: "relative", flexShrink: 0 }}>
                          <Ring p={prog} sz={isMobile ? 72 : 90} st={3} t={t} run={task.running} dn={task.done} />
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: sm, fontSize: 20, fontWeight: 300, lineHeight: 1, textDecoration: task.done ? "line-through" : "none", color: task.done ? t.mt : t.fg }}>{fmt(task.remaining)}</span>
                            <span style={{ fontSize: 8, letterSpacing: "0.12em", color: task.running ? Y : t.mt, marginTop: 3, textTransform: "uppercase", fontFamily: sf, fontWeight: task.running ? 600 : 400 }}>{task.done ? T("done") : task.running ? T("active") : T("idle")}</span>
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 600, textDecoration: task.done ? "line-through" : "none" }}>{task.name}{task.isBreak && <span style={{ fontSize: 9, marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: `${B}18`, color: B, fontWeight: 500, verticalAlign: "middle" }}>{T("microbreak")}</span>}</h3>
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
                              <button onClick={() => setEditingTask(task)} style={{ ...sB(t), width: 28, height: 28 }} title={T("editTimer")}><EditI s={11} /></button>
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
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}><input autoFocus value={nN} onChange={(e) => setNN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder={T("taskName")} style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 8, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: "0 12px", fontFamily: sf, fontSize: 13 }} /><div style={{ display: "flex", alignItems: "center", gap: 2 }}><input type="number" min={0} value={nM} onChange={(e) => setNM(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 44, height: 36, borderRadius: "8px 0 0 8px", border: `1px solid ${t.bd}`, borderRight: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 13, textAlign: "center" }} title="min" /><span style={{ height: 36, display: "flex", alignItems: "center", background: t.inp, color: t.mt, fontSize: 9, fontFamily: sf, borderTop: `1px solid ${t.bd}`, borderBottom: `1px solid ${t.bd}`, padding: "0 1px" }}>:</span><input type="number" min={0} max={59} value={nS} onChange={(e) => setNS(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} style={{ width: 44, height: 36, borderRadius: "0 8px 8px 0", border: `1px solid ${t.bd}`, borderLeft: "none", background: t.inp, color: t.fg, fontFamily: sf, fontSize: 13, textAlign: "center" }} title="sec" /></div></div>
                    <div className="add-form-fields" style={{ marginBottom: 8 }}>
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
              <div className="board-grid" style={{ minHeight: filteredTasks.length ? 360 : 0 }}>
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
            {view === "calendar" && <Suspense fallback={null}><CalendarView tasks={tasks} onCreateTask={createCalTask} onSchedule={scheduleTask} onUnschedule={unscheduleTask} onRemoveTask={removeT} play={play} pause={pause} markDone={markDone} t={t} T={T} /></Suspense>}

            {/* ═══ GALLERY ═══ */}
            {view === "gallery" && <Suspense fallback={null}><GalleryView docs={docs} setAD={(id) => { setActiveDoc(id); addRecent(id); }} setV={setView} onAddDoc={addBlankDoc} t={t} T={T} onDeleteDoc={deleteDocById} onAiHelp={(doc) => { setActiveDoc(doc.id); setView("docs"); setAiWrite({ open: true, mode: "ai" }); }} /></Suspense>}

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
                    {currentDoc.cover && <div className="glass-cover" style={{ height: isMobile ? 110 : 160, borderRadius: isMobile ? 12 : 18, marginBottom: -40, background: currentDoc.cover, boxShadow: "0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)" }}>
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
                      ? <div style={{ position: "relative" }}>
                          <div style={{ fontSize: 10, color: t.mt, marginBottom: 6, fontFamily: sf }}>{isMobile ? <button onClick={openSlashMenu} style={{ display: "inline-flex", alignItems: "center", gap: 3, height: 22, padding: "0 8px", borderRadius: 8, border: `1px solid ${t.glassBd}`, background: t.glassHi, color: R, cursor: "pointer", fontFamily: sf, fontSize: 11, fontWeight: 700, verticalAlign: "middle", marginRight: 6 }}>/</button> : <>{T("typeSlash")} <span style={{ color: R, fontWeight: 600 }}>/</span> {T("forCommands")} · </>}<span style={{ color: B }}>{T("wikiLinks")}</span>{!isMobile && <> · Ctrl+Z {T("undo")} · Ctrl+Y {T("redo")}</>}</div>
                          <textarea ref={edRef} value={currentDoc.content || ""} onChange={handleEdInput} onKeyDown={handleEdKey} placeholder={T("startWriting")} style={{ width: "100%", minHeight: isMobile ? 280 : 440, borderRadius: 12, border: `1px solid ${t.bd}`, background: t.inp, color: t.fg, padding: isMobile ? 12 : 18, fontFamily: sf, fontSize: 13, lineHeight: 1.8, resize: "vertical" }} />
                          {isMobile && <button onClick={openSlashMenu} style={{ position: "absolute", bottom: 14, right: 14, width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${t.glassBd}`, background: t.glass, backdropFilter: "blur(12px)", color: R, cursor: "pointer", fontFamily: sf, fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,.12)", zIndex: 10 }} title={T("forCommands")}>/</button>}
                        </div>
                      : <div onClick={() => setEditingDoc(true)} style={{ lineHeight: 1.75, minHeight: 280, cursor: "text" }}>{renderMd(currentDoc.content)}</div>}
                    {/* ── Dictation Panel (/iavoz) — Whisper AI ── */}
                    {dictPanel.open && (
                      <div className="glass-bar fi" style={{ marginTop: 16, padding: "18px 20px", borderRadius: 16, border: `1px solid ${isRecording ? `${R}40` : t.glassBd}`, background: t.glass, boxShadow: isRecording ? `0 0 20px ${R}15` : "0 2px 12px rgba(0,0,0,.06)" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: isRecording ? `${R}18` : dictPanel.transcribing ? `${O}18` : `${G}18`, display: "flex", alignItems: "center", justifyContent: "center", animation: isRecording ? "pulse 1.5s infinite" : "none" }}>
                              <MicI s={13} c={isRecording ? R : dictPanel.transcribing ? O : G} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: sf, letterSpacing: "-0.02em" }}>{T("voiceTitle")}</div>
                              <div style={{ fontSize: 10, color: isRecording ? R : dictPanel.transcribing ? O : G, fontFamily: sf, fontWeight: 600 }}>
                                {isRecording ? `${T("voiceRecording")} (${Math.floor(recordSecs / 60)}:${String(recordSecs % 60).padStart(2, "0")})` : dictPanel.transcribing ? T("voiceTranscribing") : dictPanel.stopped ? T("voiceStopped") : ""}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {isRecording && <button onClick={stopDictation} style={{ height: 28, padding: "0 12px", borderRadius: 8, border: "none", background: R, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>⏹ {T("stopDictation")}</button>}
                            {!isRecording && dictPanel.stopped && !dictPanel.transcribing && <button onClick={startDictation} style={{ height: 28, padding: "0 12px", borderRadius: 8, border: `1px solid ${t.bd}`, background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><MicI s={9} /> {T("dictate")}</button>}
                            <button onClick={closeDictPanel} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.bd}`, background: "transparent", color: t.mt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</button>
                          </div>
                        </div>
                        {/* Recording waveform indicator */}
                        {isRecording && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 40, marginBottom: 12 }}>
                            {[...Array(12)].map((_, i) => (
                              <div key={i} style={{ width: 3, borderRadius: 2, background: R, animation: `waveBar .8s ease-in-out ${i * 0.07}s infinite alternate`, height: 8 }} />
                            ))}
                          </div>
                        )}
                        {/* Transcribing indicator */}
                        {dictPanel.transcribing && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0", marginBottom: 12 }}>
                            <div style={{ width: 16, height: 16, border: `2.5px solid ${O}44`, borderTopColor: O, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                            <span style={{ fontSize: 12, color: O, fontFamily: sf, fontWeight: 600 }}>{T("voiceTranscribing")}</span>
                          </div>
                        )}
                        {/* Transcript area — shown when stopped */}
                        {dictPanel.stopped && !dictPanel.transcribing && (
                          <div style={{ minHeight: 60, maxHeight: 240, overflowY: "auto", padding: 14, borderRadius: 10, background: t.inp, border: `1px solid ${t.bd}`, marginBottom: 12, fontFamily: sf, fontSize: 13, lineHeight: 1.7, color: t.fg }}>
                            {dictPanel.transcript ? (
                              <span>{dictPanel.transcript}</span>
                            ) : (
                              <span style={{ color: t.mt, fontStyle: "italic" }}>{T("voiceEmpty")}</span>
                            )}
                          </div>
                        )}
                        {/* Actions — only when stopped with content */}
                        {dictPanel.stopped && dictPanel.transcript.trim() && !dictPanel.processing && !dictPanel.transcribing && (
                          <div>
                            <div style={{ fontSize: 11, color: t.mt, fontFamily: sf, marginBottom: 8, fontWeight: 600 }}>{T("voicePromptLabel")}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button onClick={insertRawTranscript} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1px solid ${t.bd}`, background: "transparent", color: t.fg, cursor: "pointer", fontFamily: sf, fontSize: 11, fontWeight: 500 }}>{T("voiceInsertRaw")}</button>
                              {[{ k: "prd", lk: "voicePromptPrd", bg: R }, { k: "brainstorm", lk: "voicePromptBrainstorm", bg: "#8B5CF6" }, { k: "summary", lk: "voicePromptSummary", bg: B }, { k: "draft", lk: "voicePromptDraft", bg: O }, { k: "free", lk: "voicePromptFree", bg: G }].map((opt) => (
                                <button key={opt.k} onClick={() => processDictWithAi(opt.k)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: opt.bg, color: "#fff", cursor: "pointer", fontFamily: sf, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>✦ {T(opt.lk)}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Processing indicator */}
                        {dictPanel.processing && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                            <div style={{ width: 14, height: 14, border: `2px solid ${R}44`, borderTopColor: R, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                            <span style={{ fontSize: 12, color: R, fontFamily: sf, fontWeight: 600 }}>{T("voiceProcessing")}</span>
                          </div>
                        )}
                        {/* Whisper badge */}
                        <div style={{ marginTop: 8, textAlign: "right" }}>
                          <span style={{ fontSize: 9, color: t.mt, fontFamily: sf, opacity: 0.6 }}>🤖 {T("whisperPowered")}</span>
                        </div>
                      </div>
                    )}
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
