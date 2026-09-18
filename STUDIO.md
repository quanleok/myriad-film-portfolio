# Studio — Project Guide

**Source of truth for the Studio writing workspace.** All agents working on Studio must read this before starting.

---

## What Is Studio?

Studio is a simple, fast workspace for AI filmmakers to organize their script and production assets. It opens as a **full-page app** (no Myriad sidebar/nav — clean, distraction-free).

**Studio is NOT**: a chatbot, a phase-gated wizard, or a complex board system.

**Studio IS**: a file-based workspace with 4 tabs — write scripts, organize characters, locations, and props.

---

## The 4 Tabs

### 1. Script
- **Left panel**: File/folder explorer (VS Code-style)
- **Center**: Text editor for writing
- **User adds files as needed** — beat sheet, act structure, scene breakdowns, notes, whatever they want
- Build-as-you-go: start empty, add structure as the project grows
- Autosave on every file

### 2. Characters
- **Left panel**: Folder list (user creates/names folders freely)
- **Center**: Image grid — drag & drop upload images into the selected folder
- Each character gets a folder → user fills it with reference images, concept art, etc.

### 3. Locations
- **Left panel**: Folder list (same pattern as Characters)
- **Center**: Image grid — drag & drop upload
- Each location gets a folder → fill with reference images, mood boards, etc.

### 4. Props
- **Left panel**: Folder list (same pattern as Characters)
- **Center**: Image grid — drag & drop upload
- Each prop gets a folder → fill with reference images

---

## Design Principles

### Simple & Fast
- No phases, no gating, no approval steps
- User opens Studio → sees their workspace → starts working
- Everything is instant — create folder, create file, drag image, done

### Build-As-You-Go (VS Code model)
- No pre-scaffolded files or folders
- User creates exactly what they need, when they need it
- If they want a beat sheet → create a file called "beat-sheet"
- If they want 20 character folders → create 20 folders
- **Never force structure on the user**

### Full-Page App
- Studio opens as its own full page — NO Myriad sidebar, NO bottom nav
- Just the workspace: tab bar at top, file explorer on left, content in center
- "Back to Myriad" link in top-left corner to return
- Clean, focused, no distractions

### Consistent Pattern
- Script tab: left = files/folders, center = text editor
- Character/Location/Prop tabs: left = folders, center = image grid
- Same interaction everywhere: create, rename, delete, drag to reorder
- Image tabs support drag & drop upload

---

## UX Details

### File Explorer (Script tab)
- Tree view with collapsible folders
- Right-click or "+" button to create file/folder
- Rename inline (double-click or F2)
- Delete with confirmation
- Click file → opens in editor
- Files save automatically (autosave indicator: saving/saved)

### Folder + Image Grid (Character/Location/Prop tabs)
- Left panel shows folder list
- Click folder → shows its images in center grid
- Drag & drop images onto grid to upload
- Grid shows thumbnails — click to enlarge/preview
- Upload to Supabase Storage (same bucket pattern as Myriad)

### Tab Bar
- Fixed at top: `Script | Characters | Locations | Props`
- Active tab highlighted
- Project title shown next to tabs

---

## Technical Boundaries

### Where Studio Lives
- Route: `src/app/(creator)/studio/[projectId]/page.tsx` (full-page, own layout)
- API: `src/app/api/studio/*`
- Components: `src/components/studio/*`
- Logic: `src/lib/studio/*`
- Types: `src/types/studio.ts`
- DB: tables prefixed `studio_`
- Storage: Supabase Storage bucket for studio assets

### Layout Rule
Studio uses its OWN layout — not the main Myriad `(creator)` layout with sidebar. The route should have a custom `layout.tsx` that renders only the Studio chrome (tab bar + back link), not the global nav.

### Data Model (simple)
- `studio_projects` — project metadata (title, format, owner)
- `studio_documents` — text files (path, content, kind)
- `studio_assets` — uploaded images (folder_path, media_url, tab: character/location/prop)
- Existing tables stay but old phase/board code is deprecated

### Rules
- Use admin client for all writes (RLS on studio tables is unreliable)
- User client for auth only — verify ownership in code before admin writes
- Autosave with debounce (1-2s)
- All uploads go through Supabase Storage, scoped to user's folder
- No AI integration in v1 — just the workspace

---

## Status

**Clean rebuild in progress.** Old phase-based code (workspace-shell, boards, focus rooms) is deprecated. Building the simple 4-tab workspace from scratch.
