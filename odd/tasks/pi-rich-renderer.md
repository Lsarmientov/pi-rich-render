# Feature: pi-rich-renderer

## Objective
TypeScript extension for Pi Coding Agent 1.0 + Gentle Shell 4.0.0 on Windows.
Improve reading, selection, copying, and exporting of structured content blocks (code, tables, diffs, JSON/YAML/XML, lists, Mermaid, LaTeX) inside the TUI.

## Problem
- Code blocks are hard to read and copy without TUI decoration contaminating the clipboard.
- Tables, diffs, and structured formats need different copy/export treatments.
- No consistent copy/expand/select/export actions across content types.

## Why
Users copy from TUI and get borders, fences, line numbers, ANSI colors — unusable in editors or spreadsheets.

## Scope
- Extension loaded via `~/.pi/agent/extensions/` or `pi --extension ./src/extension-entrypoint.ts`
- Commands: `/rich`, `/rich copy`, `/rich last`, `/rich list`, `/rich view`
- Content types: code, tables, diffs, JSON/YAML/XML, lists, Mermaid, LaTeX
- Platform: Windows (clipboard via PowerShell `Set-Clipboard`)
- No patching Pi core, no external services, no MCP required

## Constraints
- Use only public Pi APIs (`ctx.sessionManager`, `ctx.ui`, `pi.registerCommand`, `pi.on`)
- `ctx.ui.custom()` only when `ctx.mode === "tui"`
- Source always separated from render — never copy from screen
- Unsupported features documented as limitations, not shipped as broken features

## TDD Mode
**ON** — from Phase 2 onward. RED before implementation, GREEN, then REFACTOR.
Test runner: **vitest**

## Route
Delegated direct — writer subagent per phase.

## Delivery strategy
ask-on-risk. Forecast ~600 authored lines total across all phases.

## Authorized scope
Full implementation per plan. All 6 phases.

## Acceptance criteria
- [ ] Extension loads with `pi --extension ./src/extension-entrypoint.ts`
- [ ] `/rich`, `/rich copy`, `/rich last`, `/rich list`, `/rich view` all respond
- [x] Copy produces no decoration (no fences, borders, ANSI, line numbers)
- [ ] TSV export differs from Markdown source
- [x] Tests pass: Unicode, multiple blocks, empty lines, indentation, `~~~` fences, tables, clipboard errors
- [ ] README enables repeatable install and verification
- [ ] Unsupported capabilities documented as limitations

## Checks
- `npx vitest run` — all tests green (10/10 passing)
- `npx tsc --noEmit` — 0 type errors
- `pi --extension ./src/extension-entrypoint.ts` — loads without error
- Manual: `/rich copy` on a TypeScript block → paste in editor → no decoration

## Tasks

### Phase 1 — Skeleton + integration
- [x] P1-1: `npm init` + `tsconfig.json` + `package.json` with `@earendil-works/pi-coding-agent` as devDep and `vitest` as devDep
- [x] P1-2: `src/extension-entrypoint.ts` — minimal `/rich` command that calls `ctx.ui.notify("pi-rich-renderer loaded", "info")`
- [x] P1-3: Verify `pi --extension ./src/extension-entrypoint.ts` loads and `/rich` responds
- [x] P1-4: Verify `ctx.sessionManager.getBranch()` is accessible from handler (log entry count)
- Commit: `feat(skeleton): bootstrap extension entrypoint and project structure`
- Route: delegated direct | Trigger: writer (3 non-trivial files)

### Phase 2 — Code extraction and copy
- [x] P2-1 (RED): Write failing tests for `parser.ts` — fences, ~~~, no-language, Unicode, indentation, empty lines
- [x] P2-2 (GREEN): `src/content-model.ts` — `RichBlock` type + `BlockKind` enum
- [x] P2-3 (GREEN): `src/context-reader.ts` — `getBranch()` → `RichBlock[]` from assistant messages
- [x] P2-4 (GREEN): `src/parser.ts` — regex-based fence extractor, source without delimiters
- [x] P2-5 (RED): Write failing tests for `clipboard-adapter.ts`
- [x] P2-6 (GREEN): `src/clipboard-adapter.ts` — Windows `Set-Clipboard` via PowerShell, real errors
- [x] P2-7 (GREEN): `src/block-selector.ts` — `ctx.ui.select()` wrapper
- [x] P2-8 (GREEN): `/rich copy` (selector → clipboard) and `/rich last` (last unambiguous block)
- [x] P2-9 (REFACTOR): Cleanup + all tests green
- Commit: `feat(copy): code block extraction, clipboard adapter, /rich copy and /rich last`
- Route: delegated direct | Trigger: writer (5+ non-trivial files)

### Phase 3 — Tables
- [ ] P3-1 (RED): Failing tests for table detection, TSV export, JSON conditional export
- [ ] P3-2 (GREEN): Extend `parser.ts` for Markdown tables `| col |`
- [ ] P3-3 (GREEN): `src/renderers/table-renderer.ts` — aligned columns, `ctx.ui.custom()`
- [ ] P3-4 (GREEN): `src/exporters/table-exporter.ts` — Markdown source + TSV; JSON only when unambiguous
- [ ] P3-5 (REFACTOR): Edge cases (empty cells, internal pipes, L/C/R alignment)
- Commit: `feat(tables): table detection, TSV/JSON export, table renderer`
- Route: delegated direct

### Phase 4 — Remaining formats
- [ ] P4-1: `src/renderers/diff-renderer.ts` — copy without ANSI colors
- [ ] P4-2: `src/renderers/json-yaml-xml-renderer.ts` — readable display; copy original; format as explicit action
- [ ] P4-3: `src/renderers/list-renderer.ts` — hierarchy, checkboxes, order
- [ ] P4-4: `src/renderers/mermaid-renderer.ts` — source always accessible; preview if viable
- [ ] P4-5: `src/renderers/latex-renderer.ts` — source textual access
- [ ] P4-6: `src/renderer-registry.ts` — dispatch by kind
- Commit: `feat(formats): diff, json/yaml/xml, list, mermaid, latex renderers`
- Route: delegated direct

### Phase 5 — Expanded view and navigation
- [ ] P5-1: `/rich view` — `ctx.ui.custom(component, { overlay: true })` with scroll (uses `ScrollView`)
- [ ] P5-2: `/rich list` — `ctx.ui.select()` with type + preview for all detected blocks
- [ ] P5-3: Keyboard navigation: `↑↓` + `Enter` select, `Escape` close
- Commit: `feat(view): /rich view overlay and /rich list navigation`
- Route: delegated direct

### Phase 6 — Packaging
- [ ] P6-1: README — install, commands, config, known limitations
- [ ] P6-2: Manual test checklist
- [ ] P6-3: Final `package.json` — correct `main` entry, no unnecessary runtime deps
- Commit: `docs(readme): install guide, commands, limitations, manual test checklist`
- Route: inline

## Progress
- Started: 2026-10-14
- Current phase: Phase 3
- Completed Phase 1 & Phase 2.
- Phase 2 tests: 10/10 passing (Vitest), 0 TypeScript compilation errors.
- Features implemented:
  - Markdown fence & tilde parsing with full indentation and Unicode retention.
  - Windows-optimized stdin pipeline to Set-Clipboard (with fallback).
  - Context reader scanning assistant messages across active branch.
  - `block-selector` using native `ctx.ui.select`.
  - Full `/rich copy` & `/rich last` subcommands hooked up cleanly.
- Next: Phase 3 (Table parsing & TSV/JSON export).

## Engram mirror topic
`odd/pi-rich-renderer/tasks`
