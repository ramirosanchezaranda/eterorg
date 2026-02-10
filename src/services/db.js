/* ═══════ Database Service — Dexie (IndexedDB) local persistence ═══════ */
import Dexie from "dexie";

/* ── Initialize database ── */
const dexie = new Dexie("eterOrgDB");

dexie.version(1).stores({
  tasks:    "id, status, deleted, sort_order",
  docs:     "id, type, parent_id, deleted, sort_order",
  trash:    "id, itemType, deletedAt",
  settings: "id",
});

/* ── helpers ── */

/** Flatten a recursive doc tree into rows with parent_id + sort_order */
function flattenDocs(nodes, parentId = null) {
  const rows = [];
  nodes.forEach((n, i) => {
    const { children, ...rest } = n;
    rows.push({ ...rest, parent_id: parentId, sort_order: i });
    if (children) rows.push(...flattenDocs(children, n.id));
  });
  return rows;
}

/** Rebuild recursive tree from flat rows */
function buildDocTree(rows) {
  const map = {};
  const roots = [];
  rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  rows.forEach((r) => {
    map[r.id] = {
      id: r.id,
      name: r.name ?? "",
      type: r.type ?? "doc",
      content: r.content ?? "",
      icon: r.icon ?? "📄",
      cover: r.cover ?? null,
      history: r.history ?? [],
      relatedTasks: r.relatedTasks ?? [],
      createdAt: r.createdAt ?? null,
      children: r.type === "folder" ? [] : undefined,
    };
  });
  rows.forEach((r) => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children?.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

/* ═══════ PUBLIC API ═══════ */

export const db = {
  /** Always connected — IndexedDB is local */
  connected: true,

  /* ── Tasks ── */
  async loadTasks() {
    try {
      const rows = await dexie.tasks.where("deleted").notEqual(1).sortBy("sort_order");
      return rows.map((r) => ({ ...r, running: false }));
    } catch (e) { console.error("[db] loadTasks", e); return null; }
  },

  async saveTasks(tasks) {
    try {
      const rows = tasks.map((t, i) => {
        const { running, ...rest } = t; // never persist running state
        return { ...rest, sort_order: i, deleted: 0 };
      });
      await dexie.tasks.clear();
      if (rows.length) await dexie.tasks.bulkPut(rows);
    } catch (e) { console.error("[db] saveTasks", e); }
  },

  async deleteTask(id) {
    try {
      const task = await dexie.tasks.get(id);
      if (task) {
        await dexie.trash.put({ ...task, itemType: "task", deletedAt: new Date().toISOString() });
        await dexie.tasks.delete(id);
      }
    } catch (e) { console.error("[db] deleteTask", e); }
  },

  /* ── Docs ── */
  async loadDocs() {
    try {
      const rows = await dexie.docs.where("deleted").notEqual(1).sortBy("sort_order");
      return buildDocTree(rows);
    } catch (e) { console.error("[db] loadDocs", e); return null; }
  },

  async saveDocs(docs) {
    try {
      const rows = flattenDocs(docs).map((r) => ({ ...r, deleted: 0 }));
      await dexie.docs.clear();
      if (rows.length) await dexie.docs.bulkPut(rows);
    } catch (e) { console.error("[db] saveDocs", e); }
  },

  async deleteDoc(id) {
    try {
      const doc = await dexie.docs.get(id);
      if (doc) {
        await dexie.trash.put({ ...doc, itemType: "doc", deletedAt: new Date().toISOString() });
        await dexie.docs.delete(id);
      }
    } catch (e) { console.error("[db] deleteDoc", e); }
  },

  /* ── Trash ── */
  async loadTrash() {
    try {
      const items = await dexie.trash.toArray();
      items.sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
      return items;
    } catch (e) { console.error("[db] loadTrash", e); return null; }
  },

  async restoreItem(id, type) {
    try {
      const item = await dexie.trash.get(id);
      if (!item) return;
      const { itemType, deletedAt, ...rest } = item;
      if (type === "task") await dexie.tasks.put({ ...rest, deleted: 0 });
      else await dexie.docs.put({ ...rest, deleted: 0 });
      await dexie.trash.delete(id);
    } catch (e) { console.error("[db] restoreItem", e); }
  },

  async permanentDelete(id) {
    try {
      await dexie.trash.delete(id);
    } catch (e) { console.error("[db] permanentDelete", e); }
  },

  /* ── Settings ── */
  async loadSettings() {
    try {
      return await dexie.settings.get("default") ?? null;
    } catch (e) { console.error("[db] loadSettings", e); return null; }
  },

  async saveSettings(settings) {
    try {
      await dexie.settings.put({ ...settings, id: "default" });
    } catch (e) { console.error("[db] saveSettings", e); }
  },
};
