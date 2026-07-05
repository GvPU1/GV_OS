# GV OS

**A local-first, offline-first personal productivity operating system** — a single desktop app that unifies academics, tasks, projects, study sessions, career tracking, and personal knowledge into one workspace. No account, no cloud, no server: everything lives in an encrypted-at-rest-by-the-OS local database on your machine.

Built with React + TanStack Router, packaged as a native desktop app with [Tauri](https://tauri.app).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Building the desktop app](#building-the-desktop-app)
- [Data & backups](#data--backups)
- [Distributing the installer](#distributing-the-installer)
- [Known limitations](#known-limitations)
- [Roadmap ideas](#roadmap-ideas)

---

## Features

GV OS is organized as a single-page app with the following modules, each backed by its own local table:

| Module | What it does |
|---|---|
| **Dashboard** | At-a-glance view of today's tasks, upcoming items, and quick clocks. |
| **Academic** | Programs → semesters → courses hierarchy, with grades and credits. |
| **Tasks** | General to-dos with priority, status, program tagging, and due dates. |
| **Assignments** | Course-linked assignments with deadlines, priority, and submission status. |
| **Projects** | Projects with status/priority/category, each with its own task board and live progress tracking. |
| **Project Tasks** | Kanban-style per-project task board (backlog → planned → in progress → review → testing → done / blocked / cancelled). |
| **Calendar** | Unified calendar merging events, tasks, assignments, and project tasks in one month view, plus an "Upcoming deadlines" panel (overdue / due today / due this week) that deep-links back to the source item. |
| **Study** | Study session tracking. |
| **Focus** | A Pomodoro-style focus timer. |
| **Career** | Skills and certifications tracking. |
| **Ideas** | A backlog for capturing and triaging ideas. |
| **Knowledge** | Rich-text notes (powered by Tiptap) with tagging. |
| **Notifications** | Aggregated reminders/notifications across modules. |
| **Archive** | Archived items across all modules, recoverable. |
| **Settings** | App name/branding, custom program labels, theme, scale, PIN lock, and data export/import. |

**Cross-cutting features:**
- 🔍 **Command palette** (`⌘/Ctrl + K`) for fast search and navigation across all data.
- ➕ **Quick capture** (`⌘/Ctrl + N`) — a global floating button to add a task/assignment/idea from anywhere without leaving your current page.
- 🔒 **App lock** — optional PIN-based lock screen.
- 🎨 **Theming** — light/dark/system, with adjustable UI scale.
- 💾 **Local export/import** — full data backup to JSON, and a data export to Excel (`.xlsx`).
- 🖥️ **Fully offline** — no network calls, no telemetry, no account.

---

## Tech stack

**Frontend**
- [React 19](https://react.dev/) — UI
- [TanStack Router](https://tanstack.com/router) (client-side, file-based routing under `src/routes/`)
- [TanStack Query](https://tanstack.com/query) — async/query cache glue
- [Zustand](https://zustand-demo.pmnd.rs/) — small global stores (theme, settings, lock, timer, UI state)
- [Dexie.js](https://dexie.org/) + `dexie-react-hooks` — IndexedDB wrapper and reactive live queries
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [Radix UI](https://www.radix-ui.com/) primitives + a local `shadcn/ui`-style component layer (`src/components/ui/`)
- [Tiptap](https://tiptap.dev/) — rich text editor for the Knowledge module
- [date-fns](https://date-fns.org/) — date handling
- [Vite 8](https://vitejs.dev/) — build tool

**Desktop shell**
- [Tauri 2](https://tauri.app/) (Rust) — wraps the built static frontend in a native window using the OS's system WebView (WebView2 on Windows).

**Persistence**
- Everything is stored client-side in **IndexedDB via Dexie** — no backend, no server, no sync.

---

## Project structure

```
gv-os/
├─ src/
│  ├─ routes/                 # File-based routes (TanStack Router). One file per page.
│  │  ├─ __root.jsx           # App shell root: theme/settings/lock hydration, error boundary
│  │  ├─ index.jsx            # Dashboard
│  │  ├─ academic.jsx         # Programs / semesters / courses
│  │  ├─ tasks.jsx
│  │  ├─ assignments.jsx
│  │  ├─ projects.jsx
│  │  ├─ project-tasks.jsx
│  │  ├─ calendar.jsx
│  │  ├─ study.jsx
│  │  ├─ focus.jsx
│  │  ├─ career.jsx
│  │  ├─ ideas.jsx
│  │  ├─ knowledge.jsx
│  │  ├─ notifications.jsx
│  │  ├─ archive.jsx
│  │  └─ settings.jsx
│  ├─ components/             # Shared components (dialogs, app shell, command palette, clocks…)
│  │  └─ ui/                  # Radix-based primitive components (button, dialog, select, …)
│  ├─ lib/
│  │  ├─ db.ts                # Dexie database definition + versioned schema migrations
│  │  ├─ services/            # Per-domain service layer (task/project/assignment/… services)
│  │  ├─ theme.js, settings-store.js, lock-store.js, timer.js, ui-store.js  # Zustand stores
│  │  └─ format.js            # Shared date/priority/status formatting helpers
│  ├─ router.jsx              # Router + QueryClient instantiation
│  ├─ main.tsx                # App entry point (mounts <RouterProvider>)
│  └─ routeTree.gen.ts        # Auto-generated by @tanstack/router-plugin — do not edit
├─ src-tauri/                 # Rust/Tauri desktop shell
│  ├─ src/
│  │  ├─ main.rs
│  │  └─ lib.rs
│  ├─ tauri.conf.json         # Window, bundle, and security configuration
│  └─ Cargo.toml
├─ index.html
├─ vite.config.js
└─ package.json
```

Routes are picked up automatically by `@tanstack/router-plugin`'s Vite plugin — adding a new file under `src/routes/` is enough to register a new route; `routeTree.gen.ts` is regenerated on every dev/build run and should never be hand-edited.

---

## Data model

All data lives in a single Dexie (IndexedDB) database with the following tables:

`courses`, `semesters`, `tasks`, `assignments`, `projects`, `projectTasks`, `events`, `notes`, `sessions`, `skills`, `certifications`, `ideas`, `goals`, `reminders`.

The schema is defined in `src/lib/db.ts` using **versioned, additive-only migrations** (`this.version(n).stores({...})`). This means:
- Existing installs upgrade in place automatically — Dexie runs any new `version()` blocks the first time the app opens with the new code.
- Old version blocks are never edited, only new ones are added on top, so upgrading the app never destroys existing user data.

A lightweight backup layer (`src/lib/services/backup-service.ts`) can snapshot every table to a single JSON object and restore it via a single Dexie transaction (all-or-nothing). This is exposed in **Settings → Data, backup & import** as manual "Export JSON" / "Export Excel" buttons.

---

## Getting started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- For desktop builds: [Rust](https://www.rust-lang.org/tools/install) + the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS (on Windows: WebView2, which ships with modern Windows/Edge; MSVC build tools)

### Install dependencies
```bash
bun install
# or: npm install
```

### Run in the browser (fastest iteration loop)
```bash
bun run dev
```
Opens the app at `http://localhost:5173`. This runs the same client-only build the desktop app uses, just in your regular browser — useful for quick UI iteration, though `IndexedDB` data won't be shared between the browser and the packaged desktop app (separate storage origins).

### Run as a desktop app (dev mode)
```bash
bun run desktop:dev
```
Launches the Tauri window pointed at the Vite dev server, with hot reload.

---

## Available scripts

| Script | Description |
|---|---|
| `bun run dev` | Start the Vite dev server (browser only). |
| `bun run build` | Production build of the frontend to `dist/`. |
| `bun run build:dev` | Same, but in development mode (unminified, source maps). |
| `bun run preview` | Preview the production build locally. |
| `bun run lint` | Run ESLint. |
| `bun run format` | Run Prettier over the whole project. |
| `bun run desktop:dev` | Run the app as a native window via Tauri, hot-reloading against the dev server. |
| `bun run desktop:build` | Build the frontend **and** produce a native installer (see below). |

---

## Building the desktop app

```bash
bun run desktop:build
```

This runs `vite build` (outputting static files to `dist/`, per `frontendDist` in `src-tauri/tauri.conf.json`) and then compiles the Rust/Tauri shell around it. Build artifacts land under:

```
src-tauri/target/release/bundle/
├─ nsis/   → GV OS_<version>_x64-setup.exe
└─ msi/    → GV OS_<version>_x64_en-US.msi
```

Current bundle targets are Windows-only (`nsis`, `msi` in `tauri.conf.json`). To also produce macOS (`.dmg`/`.app`) or Linux (`.deb`/`.AppImage`) builds, add the relevant targets and build on (or cross-compile for) those platforms.

> **Diagnosing issues in a built app:** the Rust `devtools` feature is enabled in `Cargo.toml`, so you can right-click anywhere in the running app → **Inspect Element** to get a full DevTools console/Performance profiler, even in a release build. Remove that feature for a final public release if you don't want end users able to open DevTools.

---

## Data & backups

- All data is stored **locally only**, in IndexedDB, inside the OS WebView's app-data storage for `com.gv.studyos` (the app identifier in `tauri.conf.json`). There is no cloud sync and no server component.
- **There is currently no automatic backup.** Use **Settings → Export JSON** periodically, especially before upgrading the app or your OS. The exported file contains every table plus your preferences (theme, scale, labels, etc.) and can be restored via **Settings → Import**.
- Because backups go through a normal browser-style file download, where the file lands depends on your OS/webview download configuration (typically your Downloads folder) rather than a fixed app-managed backup directory.
- If you rely on this app for years of data, it's strongly recommended to periodically copy your exported JSON backups somewhere durable (another drive, cloud storage folder, etc.) — reinstalling Windows, clearing site data, or uninstalling the app will remove the local database.

---

## Distributing the installer

You only need to share the single generated installer (e.g. `GV OS_1.0.0_x64-setup.exe` from the `nsis` output, or the `.msi`) — it's self-contained.

A couple of things to be aware of before sharing widely:
- The installer is **unsigned** (no code-signing certificate is configured), so Windows SmartScreen will show an "Unknown publisher" warning, and some antivirus tools may flag it. This is expected for an unsigned indie build and isn't a sign of a broken build.
- The current bundle only targets Windows x64. macOS/Linux users can't run this installer — those platforms would need their own build.

---

## Known limitations

- Windows-only installer targets out of the box.
- No automatic/scheduled backups yet (manual export only).
- No cloud sync or multi-device support by design (local-first).
- Installer is unsigned.
- `devtools` is enabled in the Rust build, which also makes DevTools available to end users in release builds — disable it for a locked-down public release.

## Roadmap ideas

- Scheduled automatic local backups with rotation (the groundwork already exists in `backup-service.ts`).
- Code-signed installers.
- macOS/Linux bundle targets.
- Optional end-to-end encrypted sync between your own devices.

---

## License

GV OS Personal License

Copyright © 2026 Gowshikh Vetrivel

Permission is granted to view this repository and its source code for educational and reference purposes only.

You may not:

- Copy substantial portions of the project
- Redistribute the software
- Publish modified versions
- Use the code in commercial products
- Rebrand the project
- Sell any part of the software

Written permission from the copyright holder is required for any use beyond viewing and learning from the source code.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
