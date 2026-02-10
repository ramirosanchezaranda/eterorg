import { R, G, Y, B, O, sm } from "./theme";

/* ═══════ PRIORITIES ═══════ */
export const PRIOS = [
  { k: "P0", lk: "p0Label", c: R },
  { k: "P1", lk: "p1Label", c: O },
  { k: "P2", lk: "p2Label", c: Y },
  { k: "P3", lk: "p3Label", c: G },
];

/* ═══════ TAG COLORS ═══════ */
export const TC = [R, B, "#8B5CF6", O, G, Y, "#EC4899", "#06B6D4"];

/* ═══════ STATUS ═══════ */
export const STS = ["todo", "progress", "done"];
export const STL_KEYS = { todo: "toDo", progress: "inProgress", done: "done" };
export const STC = { todo: R, progress: Y, done: G };

/* ═══════ DOC ICONS & COVERS ═══════ */
export const ICONS = [
  "📄","📋","🎯","🚀","💡","⚡","🔥","📊","🎨","🛠","📝","🗂","📌","🧪","🏗","💎",
];

export const COVERS = [
  "linear-gradient(135deg,#D63230 0%,#E8B824 100%)",
  "linear-gradient(135deg,#2563EB 0%,#8B5CF6 100%)",
  "linear-gradient(135deg,#2AA24B 0%,#06B6D4 100%)",
  "linear-gradient(135deg,#EA580C 0%,#E8B824 100%)",
  "linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)",
  "linear-gradient(135deg,#09090B 0%,#374151 100%)",
];

/* ═══════ TEMPLATES ═══════ */
export const TMPLS = [
  { n: "PRD Template", i: "🎯", c: "# Product Requirements Document\n\n## Overview\nBrief description.\n\n## Problem Statement\nWhat problem are we solving?\n\n## Goals\n- Goal 1\n- Goal 2\n\n## Scope\n\n### In Scope\n- Feature A\n- Feature B\n\n### Out of Scope\n- Feature X\n\n## Technical Requirements\n\n### Frontend\n- Requirement 1\n\n### Backend\n- API endpoint 1\n\n## Timeline\n\n| Phase | Duration | Owner |\n|-------|----------|-------|\n| Design | 1 week | - |\n| Dev | 2 weeks | - |\n| QA | 3 days | - |" },
  { n: "Sprint Planning", i: "🚀", c: "# Sprint Planning\n\n## Sprint Goal\nDefine the main objective.\n\n## New Work\n\n### High Priority\n- [ ] Task 1 — 4h\n- [ ] Task 2 — 8h\n\n### Medium Priority\n- [ ] Task 3 — 2h\n\n## Risks\n- Blocker: ..." },
  { n: "Meeting Notes", i: "📋", c: "# Meeting Notes\n\n## Attendees\n- Person A\n- Person B\n\n## Agenda\n1. Topic 1\n2. Topic 2\n\n## Action Items\n- [ ] @Person A — task\n- [ ] @Person B — task" },
  { n: "Design Brief", i: "🎨", c: "# Design Brief\n\n## Objectives\n- Objective 1\n\n## Target Audience\nDescribe users.\n\n## Deliverables\n- [ ] Wireframes\n- [ ] Mockups\n- [ ] Prototype" },
  { n: "Daily Standup", i: "⚡", c: "# Daily Standup\n\n## Yesterday\n- Completed task A\n\n## Today\n- Continue task B\n\n## Blockers\n- None" },
  { n: "Blank", i: "📄", c: "" },
];

/* ═══════ SLASH COMMANDS ═══════ */
export const SLASH = [
  { cmd: "h2", lk: "slashHeading2", ic: "H2", ins: "\n## " },
  { cmd: "h3", lk: "slashHeading3", ic: "H3", ins: "\n### " },
  { cmd: "bullet", lk: "slashBullet", ic: "•", ins: "\n- " },
  { cmd: "check", lk: "slashCheckbox", ic: "☐", ins: "\n- [ ] " },
  { cmd: "quote", lk: "slashQuote", ic: "❝", ins: "\n> " },
  { cmd: "hr", lk: "slashDivider", ic: "—", ins: "\n---\n" },
  { cmd: "toggle", lk: "slashToggle", ic: "▸", ins: "\n>>> Toggle title\n  Content\n" },
  { cmd: "tip", lk: "slashTip", ic: "💡", ins: "\n!!! tip Your tip\n" },
  { cmd: "warn", lk: "slashWarn", ic: "⚠️", ins: "\n!!! warning Message\n" },
  { cmd: "info", lk: "slashInfo", ic: "ℹ️", ins: "\n!!! info Info here\n" },
  { cmd: "img", lk: "slashImage", ic: "🖼", ins: "\n![desc](url)\n" },
  { cmd: "vid", lk: "slashVideo", ic: "🎬", ins: "\n[video](url)\n" },
  { cmd: "table", lk: "slashTable", ic: "⊞", ins: "\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A | B | C |\n" },
  { cmd: "bold", lk: "slashBold", ic: "B", ins: "**text**" },
  { cmd: "code", lk: "slashCode", ic: "</>", ins: "`code`" },
  { cmd: "link", lk: "slashLink", ic: "🔗", ins: "[[Document Name]]" },
  { cmd: "ai", lk: "slashAi", ic: "✦", ai: true },
  { cmd: "draft", lk: "slashDraft", ic: "📝", ai: true },
  { cmd: "brainstorm", lk: "slashBrainstorm", ic: "💡", ai: true },
  { cmd: "summarize", lk: "slashSummarize", ic: "📋", ai: true },
  { cmd: "continue", lk: "slashContinue", ic: "▸▸", ai: "continue" },
];

/* ═══════ INITIAL DOCS DATA ═══════ */
export const INITIAL_DOCS = (nowFn, covers) => [
  {
    id: "wf", name: "Getting Started", type: "folder", children: [
      { id: "intro", name: "Welcome", type: "doc", icon: "🚀", cover: covers[0], history: [], content: "# Welcome to eterOrg\n\nYour docs and timers, **connected**.\n\n## Features\n\n- Write PRDs — generate timed tasks with AI\n- **Kanban board** + **Table** + **Calendar** + **Gallery** views\n- **Wiki links**: `[[Document Name]]`\n- **Slash commands**: type `/` in editor\n- **Templates** for common docs\n- **⌘B / Ctrl+B** global search\n- **Drag & drop** everything\n- **Sub-tasks**, filters, reminders, trash, undo/redo\n\n>>> Toggle Lists\n  Use `>>>` for collapsible sections\n\n!!! tip Try creating tasks from the Example PRD\n\n| Feature | Status |\n|---------|--------|\n| Kanban | ✅ |\n| Calendar | ✅ |\n| Gallery | ✅ |\n| Filters | ✅ |\n\nLink to [[Example PRD]] to see it in action.", relatedTasks: [], createdAt: nowFn() },
      { id: "eprd", name: "Example PRD", type: "doc", icon: "🎯", cover: covers[1], history: [], content: "# Landing Page Redesign\n\n## Objective\nRedesign landing page to improve conversion by 25%.\n\n## Scope\n\n### Design\n- Wireframes for desktop & mobile\n- New hero section with animations\n- Pricing comparison table\n- Testimonials carousel\n\n### Development\n- Responsive hero with CSS animations\n- Pricing toggle monthly/annual\n- Testimonials API integration\n- Form validation\n- A/B testing framework\n\n### QA\n- Cross-browser testing\n- Performance audit (LCP < 2s)\n- Deployment docs\n- Analytics tracking\n\n| Phase | Duration | Owner |\n|-------|----------|-------|\n| Design | 1 week | Design |\n| Dev | 2 weeks | Eng |\n| QA | 3 days | QA |\n\n!!! info See [[Welcome]] for tool overview", relatedTasks: [], createdAt: nowFn() },
    ],
  },
  { id: "nf", name: "Project Notes", type: "folder", children: [] },
];
