export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const fmtDur = (totalSec) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

export const now = () =>
  new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Argentina Buenos Aires timezone helpers */
const AR_TZ = "America/Argentina/Buenos_Aires";
export const todayAR = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
};
export const nowAR = () => {
  const d = new Date();
  const hh = d.toLocaleString("en-US", { timeZone: AR_TZ, hour: "2-digit", hour12: false }).padStart(2, "0");
  const mm = d.toLocaleString("en-US", { timeZone: AR_TZ, minute: "2-digit" }).padStart(2, "0");
  return { h: parseInt(hh, 10), m: parseInt(mm, 10), time: `${hh.slice(-2).padStart(2,"0")}:${mm.slice(-2).padStart(2,"0")}` };
};
export const nowAR_HM = () => {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: AR_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(new Date());
};

export const isSameDay = (a, b) => a === b;

export const downloadFile = (name, content, mime = "text/markdown") => {
  const b = new Blob([content], { type: mime });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
};
