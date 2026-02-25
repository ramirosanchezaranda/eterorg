/* ═══════ Filesystem Service — File System Access API (Progressive Enhancement) ═══════ */

/** Check if the File System Access API is available */
export const isSupported = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

let dirHandle = null;

/* ─── IndexedDB helpers to persist the directory handle across reloads ─── */
const IDB_NAME = "eterOrgFS";
const IDB_STORE = "handles";
const IDB_KEY = "workspace";

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store the FileSystemDirectoryHandle in IndexedDB */
async function storeHandle(handle) {
  try {
    const idb = await openHandleDB();
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    idb.close();
  } catch (e) { console.warn("[fs] storeHandle", e); }
}

/** Retrieve the FileSystemDirectoryHandle from IndexedDB */
async function retrieveHandle() {
  try {
    const idb = await openHandleDB();
    const tx = idb.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    const handle = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
    idb.close();
    return handle || null;
  } catch (e) { console.warn("[fs] retrieveHandle", e); return null; }
}

/** Clear the stored handle from IndexedDB */
async function removeStoredHandle() {
  try {
    const idb = await openHandleDB();
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    idb.close();
  } catch (e) { console.warn("[fs] removeStoredHandle", e); }
}

/** Prompt the user to pick a workspace directory */
export async function pickFolder() {
  if (!isSupported()) return null;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await storeHandle(dirHandle);
    return dirHandle.name;
  } catch (e) {
    if (e.name === "AbortError") return null; // user cancelled
    console.error("[fs] pickFolder", e);
    return null;
  }
}

/**
 * Try to restore the previously-picked folder handle from IndexedDB.
 * Returns the folder name if successful, null otherwise.
 
*/
export async function restoreFolder() {
  try {
    const stored = await retrieveHandle();
    if (!stored) return null;
    // Verify we still have permission
    const opts = { mode: "readwrite" };
    if ((await stored.queryPermission(opts)) === "granted") {
      dirHandle = stored;
      return dirHandle.name;
    }
    // Try requesting permission (requires user gesture — will usually fail here,
    // but we still set the handle so the next user click can re-request)
    dirHandle = stored;
    return dirHandle.name;
  } catch (e) {
    console.warn("[fs] restoreFolder", e);
    return null;
  }
}

/** Verify we still have permission, re-request if needed */
async function ensurePermission() {
  if (!dirHandle) return false;
  try {
    const opts = { mode: "readwrite" };
    if ((await dirHandle.queryPermission(opts)) === "granted") return true;
    if ((await dirHandle.requestPermission(opts)) === "granted") return true;
    return false;
  } catch {
    return false;
  }
}

/** Get or create a sub-directory (one level) */
async function getDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

/** Write a text file inside a directory handle */
async function writeFile(dir, name, content) {
  const fh = await dir.getFileHandle(name, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
}

/** Read a text file from a directory handle */
async function readFile(dir, name) {
  try {
    const fh = await dir.getFileHandle(name);
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

/* ═══════ PUBLIC API ═══════ */

/**
 * Save project files to the workspace:
 *   /HeterorgWorkspace/projects/<slug>/project.json  (tasks + docs + settings)
 *   /HeterorgWorkspace/projects/<slug>/docs/<docName>.md  (individual doc files)
 */
export async function saveProject(slug, prdContent, projectJson) {
  if (!dirHandle) return false;
  if (!(await ensurePermission())) return false;
  try {
    const wsDir = await getDir(dirHandle, "HeterorgWorkspace");
    const projDir = await getDir(wsDir, "projects");
    const slugDir = await getDir(projDir, slug || "default");
    // Save main project bundle
    await writeFile(slugDir, "project.json", JSON.stringify(projectJson, null, 2));
    // Save individual doc .md files for easy access
    if (projectJson.docs) {
      const docsDir = await getDir(slugDir, "docs");
      const flatDocs = flattenDocsForFS(projectJson.docs);
      for (const d of flatDocs) {
        if (d.type === "doc" && d.content) {
          const safeName = d.name.replace(/[<>:"/\\|?*]/g, "_").slice(0, 100) || "untitled";
          await writeFile(docsDir, `${safeName}.md`, d.content);
        }
      }
    }
    return true;
  } catch (e) {
    console.error("[fs] saveProject", e);
    return false;
  }
}

/** Flatten recursive docs for file-by-file saving */
function flattenDocsForFS(nodes) {
  const result = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenDocsForFS(n.children));
  }
  return result;
}

/**
 * Load project from filesystem
 */
export async function loadProject(slug) {
  if (!dirHandle) return null;
  if (!(await ensurePermission())) return null;
  try {
    const wsDir = await getDir(dirHandle, "HeterorgWorkspace");
    const projDir = await getDir(wsDir, "projects");
    const slugDir = await getDir(projDir, slug || "default");
    const jsonStr = await readFile(slugDir, "project.json");
    if (!jsonStr) return null;
    return { project: JSON.parse(jsonStr) };
  } catch {
    return null;
  }
}

/** Check if a workspace folder is currently active */
export function hasFolder() {
  return !!dirHandle;
}

/** Get the folder name */
export function getFolderName() {
  return dirHandle?.name || null;
}

/** Clear the workspace handle */
export function clearFolder() {
  dirHandle = null;
  removeStoredHandle();
}

/** Export project as a downloadable JSON bundle */
export function exportProjectBundle(tasks, docs, settings) {
  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    docs,
    settings,
  };
  return JSON.stringify(bundle, null, 2);
}

/** Validate and parse an imported bundle */
export function parseImportBundle(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !Array.isArray(data.tasks) || !Array.isArray(data.docs)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
