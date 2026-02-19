/* ═══════ Filesystem Service — File System Access API (Progressive Enhancement) ═══════ */

/** Check if the File System Access API is available */
export const isSupported = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

let dirHandle = null;

/** Prompt the user to pick a workspace directory */
export async function pickFolder() {
  if (!isSupported()) return null;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    return dirHandle.name;
  } catch (e) {
    if (e.name === "AbortError") return null; // user cancelled
    console.error("[fs] pickFolder", e);
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
 *   /HeterorgWorkspace/projects/<slug>/PRD.md
 *   /HeterorgWorkspace/projects/<slug>/project.json
 */
export async function saveProject(slug, prdContent, projectJson) {
  if (!dirHandle) return false;
  if (!(await ensurePermission())) return false;
  try {
    const wsDir = await getDir(dirHandle, "HeterorgWorkspace");
    const projDir = await getDir(wsDir, "projects");
    const slugDir = await getDir(projDir, slug || "default");
    await writeFile(slugDir, "PRD.md", prdContent || "");
    await writeFile(slugDir, "project.json", JSON.stringify(projectJson, null, 2));
    return true;
  } catch (e) {
    console.error("[fs] saveProject", e);
    return false;
  }
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
    const prd = await readFile(slugDir, "PRD.md");
    const jsonStr = await readFile(slugDir, "project.json");
    if (!jsonStr) return null;
    return { prd, project: JSON.parse(jsonStr) };
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
