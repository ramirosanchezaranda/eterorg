# eterOrg codebase notes for AI agents

## Big picture
- **Vite + React 19** project. Entry point is `src/main.jsx` → `src/App.jsx`.
- Core domains are Tasks, Docs, and Views. Tasks drive Timers/Board/Table/Calendar; Docs drive the markdown editor/preview and gallery.
- Data is in-memory only (no persistence). All state for tasks/docs lives in `App()` and is passed down via props.
- Legacy monolith `eterOrg.jsx` is kept at root for reference; the active codebase is under `src/`.

## Project structure
```
src/
  main.jsx              # ReactDOM entry
  index.css             # Global CSS + keyframe animations
  App.jsx               # Main app: all state, sidebar, views
  utils/index.js        # uid, fmt, now, today, isSameDay, downloadFile
  constants/
    theme.js            # mkT(), palette (R,G,Y,B,P,O), font stacks (sf, sm)
    index.js            # PRIOS, TC, STS, STL, STC, ICONS, COVERS, TMPLS, SLASH
  services/ai.js        # genTasks() — Anthropic API call
  hooks/useMd.jsx       # useMd() markdown renderer + inl() inline parser
  components/
    icons.jsx           # ~30 SVG icon components
    ui/
      styles.js         # tB, sB, pill style-object helpers
      Ring.jsx           # Timer progress ring
      Toasts.jsx         # Notification toasts
      FilterBar.jsx      # Priority/status/tag filter bar
      SubTaskInput.jsx   # Inline sub-task input
    markdown/
      MdParts.jsx        # Toggle, Callout, MdTbl
    modals/
      SearchModal.jsx    # Global search (Ctrl+B)
      TaskPreview.jsx    # AI-generated task preview/confirm
      TrashModal.jsx     # Trash manager
      SlashMenu.jsx      # Slash command menu
    views/
      CalendarView.jsx   # Monthly calendar with tasks
      GalleryView.jsx    # Document gallery grid
      DocTree.jsx        # Recursive doc/folder sidebar tree
```

## Key structures and data shapes
- Task shape is created by `mkTask()` in `App.jsx`; keep fields consistent (e.g., `minutes`, `remaining`, `status`, `tags`, `subtasks`, `reminder`). Changes should go through helpers like `play()`, `pause()`, `markDone()`, `resetT()`.
- Doc tree nodes are recursive with `{ id, name, type: "folder"|"doc", children? }`. Docs include `content`, `icon`, `cover`, `history`, `relatedTasks`. See initial `docs` state in `App.jsx`.
- Markdown preview uses custom renderer `useMd()` + `inl()` in `src/hooks/useMd.jsx` (supports headings, lists, tables, `[[wiki links]]`, callouts, toggles). If you add syntax, extend these functions there.

## UI/Styling conventions
- Styling is inline style objects; theming flows from `mkT(dk)` into `t`. Reuse palette constants (`R`, `G`, `Y`, `B`, etc.) from `src/constants/theme.js` and small helpers (`tB`, `sB`, `pill`) from `src/components/ui/styles.js`.
- Icons are lightweight SVG components in `src/components/icons.jsx` (e.g., `ChevR`, `Trash`, `SearchI`). Add new icons there.

## Integration points
- AI task generation is a direct `fetch()` to the Anthropic Messages API in `genTasks()` at `src/services/ai.js` with model `claude-sonnet-4-20250514`. It expects JSON-only output and parses it; keep that contract if you modify prompts.

## Interaction patterns
- Docs editing uses undo/redo stacks (`undoStack`, `redoStack`) in `handleEdKey()` and `handleEdInput()` inside `App.jsx`.
- Drag-and-drop is used for doc tree nesting and task reordering; follow the existing `dataTransfer` keys (`taskId` for tasks).

## Build & dev
- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally
- No test framework configured yet.