# Feature: pi-rich-renderer — v0.2 plan

   Repo: https://github.com/Lsarmientov/pi-rich-render · Branch: `main` · Package: `pi-rich-renderer` (Pi coding-agent extension)
   Status: v0.1 shipped; the v0.2 phases below are NOT started. This document is the self-contained handoff for the models implementing v0.2: read it
 fully before acting and update `## Progress` as tasks complete. It replaces the v0.1 record, which remains in git history.

   ## Objective
   Make the extension handle rich content like a first-class citizen of the Pi TUI: code, tables, diffs, JSON/YAML/XML and diagram sources, each with
 a fast path to copy its raw content and to inspect it in an expanded, interactive viewer -- without breaking Pi's terminal-native constraints.
 Concretely, v0.2 delivers:
   1. A copy pipeline that works on Windows/macOS/Linux and over SSH/remote sessions (OSC 52).
   2. A richer `/rich view` overlay: keyboard-first navigation plus click targets where Pi routes mouse input (fullscreen mode).
   3. An evidence-based decision on whether assistant-transcript blocks can be hooked for inline affordances; if not, the overlay-command model
 remains the only supported path.
   4. Packaging that lets a user install the extension cleanly (documented symlink flow; npm artifact ready).
   This is a terminal UI: visuals are approximations (box-drawing, ANSI colors), never HTML-like chrome.

   ## As-built (v0.1) -- verified state
   Commands (registered in `src/extension-entrypoint.ts` via `pi.registerCommand("rich", ...)`):
   - `/rich` (help), `/rich copy` (pick a block -> Markdown/TSV/JSON via `ctx.ui.select`), `/rich last`, `/rich list`, `/rich view` (overlay via
 `ctx.ui.custom<void>(..., { overlay: true })`).
   - `pi.on("session_start", ...)` announces readiness; non-TUI modes are guarded (`ctx.mode !== "tui"`).
   Architecture (one line per file):
   - `index.ts` -- re-export of `src/extension-entrypoint.ts` (jiti-safe entry).
   - `src/context-reader.ts` -- transcript blocks via `ctx.sessionManager.getBranch()` (current branch only).
   - `src/parser.ts` -- fences (backtick and tilde runs, nested) + GFM tables -> `RichBlock`; strips delimiters.
   - `src/block-selector.ts` -- `ctx.ui.select` wrapper + option formatting.
   - `src/clipboard-adapter.ts` -- copyToClipboard: Windows (PowerShell/clip) -> macOS (`pbcopy`) -> Linux (`xclip`).
   - `src/renderer-registry.ts` -- block kind -> component (`ComponentInstance` with `render(width)` + `handleInput`).
   - `src/renderers/{code,table,diff,json-yaml-xml,diagram}-renderer.ts` -- hand-rolled, width-safe (`truncateToWidth`, `visibleWidth`),
 keyboard-driven; no mouse.
   - `src/exporters/table-exporter.ts` -- table -> TSV/JSON (refuses ambiguous headers).
   Tests: 21 `it` across 4 suites -- parser (8), table-exporter (6), renderer-registry (5), clipboard-adapter (2). Claimed green at v0.1 close (21/21)
 with `npx tsc --noEmit` = 0 errors; RE-RUN AND RECORD IN F0 -- treat as unverified until then.
   History: v0.1 was built in 7 commits on `master` (never pushed); latest message: `docs(readme): install guide, commands, limitations, manual test
 checklist`.
   Divergence from the original plan: `action-layer.ts`, `list-renderer.ts`, `mermaid-renderer.ts`, `latex-renderer.ts`, `tests/action-layer.test.ts`
 were planned but never built; the equivalent behavior lives in `renderer-registry.ts` / `block-selector.ts`. The phases below do not require those
 files unless a phase says so.
   Known v0.1 limitations (README.md): no raster/SVG diagram preview in a standard TUI; context scope = active branch only;
 the raw-`.ts` entrypoint and the missing build step were addressed in F0 (an esbuild build emits `dist/index.js`, and `main`/`types` resolve to it); renderer components have no unit tests; no mouse input; no OSC 52 path.
   Binary reference: `pi-rich-renderer-brief.docx` -- open manually if needed; do not parse programmatically.

   ## Constraints and verified environment facts
   From the installed Pi documentation (package `@earendil-works/pi-coding-agent`, `docs/`):
   - `MouseRegion` adds pointer behavior around another component (`docs/tui.md:40`).
   - Fullscreen mode routes normalized mouse events to components; a handler can mark events handled, capture drags, request focus, request render
 (`docs/tui.md:58`).
   - Regular mode leaves mouse input to the terminal because the terminal owns scrollback (`docs/tui.md:62`). Any mouse affordance must be optional
 and a silent no-op outside fullscreen.
   - Unhandled primary-button drags remain available for transcript selection; OSC 8 links take precedence over click regions (`docs/tui.md:60`).
   - `ctx.ui.custom()` temporarily gives one component control of the interactive area and resolves via a completion callback (`docs/tui.md:66`).
   - Built-in copy of the last assistant message: `Ctrl+X` / `/copy` (`docs/keybindings.md:165`, `docs/slash-commands.md:37`); fullscreen
 copy-on-select via `fullscreenCopyOnSelect` (default `true`) (`docs/settings.md:100`); `PI_CLIPBOARD_OSC52=1` additionally sends copied text to the
 terminal via OSC 52 (`docs/environment-variables.md:91`).
   - Tool rendering hooks (`renderCall`/`renderResult`) cover tool calls -- not assistant markdown blocks (`docs/extensions.md`).
   - Pi core renders no diff view; docs only show piping a diff INTO pi (`docs/cli.md:26`).
   OPEN QUESTIONS (resolve with documentation evidence; never invent APIs):
   - O1: Is there any supported extension hook to render/intercept assistant markdown or code blocks per block? (Not documented in the files above --
 F1 decides.)
   - O2: Can an extension emit OSC 52 itself and have the terminal apply it, independent of Pi core's copy path? (F2 verifies; fall back to platform
 clipboard tools.)
   - O3: Does Pi support distributing extensions as packages, and how? (`docs/packages.md` -- check in F5.)

   ## Working agreement for implementing models
   - Read this document fully before touching code; work one phase at a time.
   - TDD: write the failing test first (RED), implement (GREEN), then refactor; keep tests deterministic and offline.
   - Commands: `npm ci` -> `npm test` -> `npx tsc --noEmit` before and after each phase; record raw results.
   - Commits: Conventional Commits, English, one reviewable unit at a time; never commit `node_modules`.
   - Evidence: every checked task carries the command(s) run and the result; unknown or blocked items are labeled, never guessed.
   - Never reduce existing behavior (`/rich` must keep working); when user-visible behavior changes, update the README (Spanish).
   - Keep `## Progress` current; append findings under `## Log`.

   ## Specs
   S1 (F0 baseline): a clean checkout runs `npm ci`, `npm test`, `npx tsc --noEmit` and all three pass.
   S2 (F0 build): `package.json` `main` resolves to an emitted file under `dist/`; `index.ts` keeps working for jiti/dev loads; a `build` script exists.
   S3 (F0 ignores): `.gitignore` covers `node_modules/` and `dist/`.
   S4 (F0 load): `/rich` is available after loading with `pi --extension ./src/extension-entrypoint.ts` and via the README symlink install; if the `pi` CLI is unavailable, F0.4 is marked blocked and the phase continues.
   S5 (F1): `docs/spike-render-hooks.md` exists with cited evidence and an explicit verdict `INLINE-OK` or `OVERLAY-ONLY`; no undocumented mechanism is proposed.
   S6 (F2): copying works on Windows, macOS, Linux and remote/SSH (OSC 52 fallback); no clipboard tool yields a clear, actionable error; new tests are green (RED first); README (Spanish) documents the behavior.
   S7 (F3): `/rich view` is keyboard-first with mouse click targets only where Pi routes mouse events (fullscreen) and a silent no-op otherwise; a 100+ line block is navigable; tests are green; no regression in `/rich list` / `/rich copy`.
   S8 (F4): CSV and Markdown table exports; diff filename header, hunk context and plus or minus colors; JSON/YAML/XML pretty versus raw toggle; diagram output stays text-only and copies the raw source; new tests are green; `/rich copy` options are documented.
   S9 (F5): the supported distribution route from `docs/packages.md` is followed or its gap documented; npm readiness (`files` whitelist, version `0.2.0`, `npm pack` dry-run reviewed); README updated (Spanish, OSC 52 caveats and fullscreen-only mouse); a fresh install works per README.
   S10 (F6): `CHANGELOG.md` added and tag `v0.2.0` pushed; final acceptance pass recorded; the document is closed for v0.2 with v0.3 notes.
   S11 (global): `npm test` and `npx tsc --noEmit` are green on the release commit; all `/rich` commands behave per README; no regression from v0.1.
   S12 (global): no capability shipped that is not supported by documented APIs; unknowns are resolved (F1) or explicitly deferred; rendering stays terminal-native; mouse stays optional.

   ## Phases

   ### F0 -- Baseline and build hygiene (Size: S)
   Goal: a reproducible, verifiable baseline and an artifact that does not depend on raw TypeScript.
   Tasks:
   - [x] F0.1 `npm ci`; `npm test`; `npx tsc --noEmit`; record exact results under Progress.
   - [x] F0.2 Add a real build: emit `dist/` (tsc or esbuild) and point `package.json` `main` at the emitted file while keeping `index.ts` working for
 jiti/dev loads. Add a `build` script.
   - [x] F0.3 Confirm `.gitignore` covers `node_modules/` and `dist/`.
   - [x] F0.4 Verify the extension loads: `pi --extension ./src/extension-entrypoint.ts` (dev flow) and the README symlink install; record exact
 commands and outcomes.
   Acceptance: clean checkout -> `npm ci`, `npm test`, `npx tsc --noEmit` all pass; `main` resolves to an emitted file; `/rich` is available after
 load.
   Evidence: raw command outputs recorded in Progress. Stop: if the `pi` CLI is unavailable, mark F0.4 blocked and continue.

   ### F1 -- Spike: assistant markdown/message render hooks (Size: S)
   Goal: decide with evidence whether v0.2 can render per-block affordances inline in the assistant transcript, or whether the overlay-command model
 is the only supported path.
   Tasks:
   - [x] F1.1 Search installed Pi docs and typings for extension APIs that render or intercept assistant messages/markdown; quote exact `path:line`
 hits.
   - [x] F1.2 If a supported hook exists, describe it (API, lifecycle, width/state contracts) and design the minimal copy-button integration (design
 only, no hacks).
   - [x] F1.3 Write `docs/spike-render-hooks.md`: question, evidence, verdict `INLINE-OK` or `OVERLAY-ONLY`, consequences for F3/F4, and what would
 change the verdict.
   Acceptance: spike doc exists with cited evidence; verdict explicit; no undocumented mechanism proposed.
   Kill criteria: no documented hook -> verdict `OVERLAY-ONLY`; stop F1; do not patch Pi internals or monkey-patch renderers.

   ### F2 -- Clipboard and copy UX (Size: M)
   Goal: copying that works on Windows, macOS, Linux and remote/SSH sessions.
   Tasks:
   - [x] F2.1 Extend `src/clipboard-adapter.ts`: Windows (PowerShell `Set-Clipboard`/`clip`), macOS (`pbcopy`), Linux (`wl-copy`, then `xclip
 -selection clipboard`), each behind an availability probe; preserve the plain-text contract.
   - [x] F2.2 OSC 52 fallback: base64-encode and emit the `ESC ] 52 ; c ; <base64> BEL` sequence; make it selectable or automatic when running over
 SSH / when `PI_CLIPBOARD_OSC52` semantics apply (`docs/environment-variables.md:91`); document which terminals must allow it.
   - [x] F2.3 Unit tests: adapter-selection matrix (mocked runner), OSC 52 encoding vectors, failure paths (no clipboard tool -> clear, actionable
 error).
   - [x] F2.4 Manual verification on the primary OS; for remote/SSH verify or explicitly record as unverified.
   Acceptance: new tests green (RED first); copy verified on Windows; behavior documented in the README (Spanish).

   ### F3 -- Expanded viewer interactions (Size: M)
   Goal: `/rich view` becomes genuinely interactive -- keyboard-first, with click targets where Pi supports them.
   Tasks:
   - [x] F3.1 Mouse: direct `handleMouse` handlers on all five overlay renderers scroll vertically on wheel and copy on the right-aligned `[ copy ]`
 label; all other clicks remain unhandled. `MouseRegion` was not used because its declaration lacks `handleInput` forwarding, which would break keyboard parity; Pi dispatches directly to fullscreen overlays (`tui.js:517-526`), while regular mode remains a silent no-op.
   - [x] F3.2 Keyboard parity: every mouse action has a key equivalent (`c` copy, `q`/`Esc` close, `PgUp`/`PgDn`/arrows scroll, `g`/`G` top/bottom),
 following existing `matchesKey` patterns.
   - [x] F3.3 Long blocks: windowed scrolling; line numbers for code; keep width-safe rendering (`truncateToWidth`, `visibleWidth`).
   - [x] F3.4 Tests: component `render(width)` snapshots and `handleInput` key cases (mock input); update the README manual checklist.
   Acceptance: tests green; a 100+ line block is navigable; mouse copy works in fullscreen and no-ops otherwise; no regression in `/rich list` /
 `/rich copy`.

   ### F4 -- Format coverage polish (Size: M)
   Goal: table/diff/data blocks match the reference UX (labels, colors, export formats).
   Tasks:
   - [ ] F4.1 `table-exporter`: add CSV and Markdown exports alongside TSV/JSON; tests for quoting/escaping.
   - [ ] F4.2 `diff-renderer`: filename header line, hunk context, +/- colors; tests for add/remove/context classification.
   - [ ] F4.3 JSON/YAML/XML: pretty vs raw toggle; parse errors surface as plain text; copy stays raw-source.
   - [ ] F4.4 `diagram-renderer`: keep text-only output; copy exports the original source; keep the raster limitation documented.
   Acceptance: new exporters/renderers tested (RED first); `/rich copy` options extended and documented.

   ### F5 -- Packaging and distribution (Size: M)
   Goal: clean install paths for real users.
   Tasks:
   - [ ] F5.1 Check `docs/packages.md` for the supported extension distribution route; follow it or document the gap.
   - [ ] F5.2 npm readiness: `files` whitelist, version `0.2.0`, `npm pack` dry-run inspection (artifact contains only intended files).
   - [ ] F5.3 README: update install/commands/limitations (Spanish); document OSC 52 caveats and fullscreen-only mouse behavior.
   - [ ] F5.4 Clean-environment install verification (fresh HOME or second machine): symlink install -> `/rich` smoke test.
   Acceptance: `npm pack` artifact reviewed; fresh install works per README.

   ### F6 -- Release (Size: S)
   Tasks:
   - [ ] F6.1 Add `CHANGELOG.md`; tag `v0.2.0`; push the tag.
   - [ ] F6.2 Final acceptance pass: full test suite + README manual checklist; record results.
   - [ ] F6.3 Update this document: mark phase statuses, close v0.2, open notes for v0.3.
   Acceptance: tag exists; suite + checklist green; Progress closed.

   ## Global acceptance criteria
   - `npm test` and `npx tsc --noEmit` green on the release commit.
   - All `/rich` commands behave per README; no regression from v0.1.
   - No capability shipped that is not supported by documented APIs; unknowns resolved (F1) or explicitly deferred.
   - Constraints honored: terminal-native rendering only; mouse optional; clipboard covers OS fallbacks and OSC 52.
   - This document kept current (Progress + Log).

   ## Risks & unknowns
   - Inline per-block rendering may be impossible (F1 may return `OVERLAY-ONLY`); the plan does not depend on it.
   - Mouse input exists only in fullscreen mode; regular-mode users rely on the keyboard (by design).
   - Diagram previews stay text-only; terminals cannot render raster/SVG inline.
   - Remote/SSH clipboard is terminal-dependent; OSC 52 support varies and may be disabled.
   - Dev-dependency versions are wildcards (`*`); API drift is possible -- consider pinning during F0/F5.
   - Single-maintainer project: keep evidence in-repo so any model or session can resume.

   ## Progress
   | Phase | Status | Evidence |
   | --- | --- | --- |
   | F0 | done | `npm test` 27/27 (5 files) and `npx tsc --noEmit` 0 errors at closure; `npm run build` reproducible (27,811 B bundle + 119 B d.ts, no `.ts` specifiers); `esbuild ^0.28.2` declared directly; clean `npm ci` path green; `/rich` loaded from the source entrypoint and from the extension directory, with and without `dist`, so the `main` -> `dist/index.js` change does not break directory installs. |
   | F1 | done | `docs/spike-render-hooks.md` — verdict INLINE-OK for text/ANSI block transformation (hook `registerMarkdownTransformer`, typings-only, absent from `docs/*.md`); interactive affordances OVERLAY-ONLY (transformer returns `string`). |
   | F2 | done | Per-OS selection with availability probes (powershell/clip, pbcopy, wl-copy/xclip); OSC 52 fallback (`ESC ]52;c;<base64> BEL`) only when no local tool is found and gated on `PI_CLIPBOARD_OSC52` or SSH, with an explicit false value vetoing auto-detection; 19 deterministic clipboard tests plus an opt-in Windows integration test; `/rich list` copy errors notify instead of rejecting unhandled; Unicode fix: the Windows payload crosses the pipe as ASCII base64 and is decoded as UTF-8 inside PowerShell, because the previous raw UTF-8 pipe was decoded with the console code page and turned `í` into `├¡`; user verified the paste character for character. |
   | F3 | done | Overlay sizing (`maxHeight = rows - 6`), vertical and horizontal windowing, keyboard parity, fullscreen-only mouse, and `c` copy with hint-line status; focused tests 17/17, `npm test` 82 passed (1 skipped), `npx tsc --noEmit` 0 errors. |
   | F4 | not started | |
   | F5 | not started | |
   | F6 | not started | |

   ## Checks
   ```
   npm ci
   npm test
   npx tsc --noEmit
   pi --extension ./src/extension-entrypoint.ts
   ```

   ## Log
   - L1 (user request, verbatim): "ok pero subamos lo que esta ahora -> https://github.com/Lsarmientov/pi-rich-render.git , sube los cambios y dejas
 el nuevo odd bien detallado agotare en otro modelos separalo por fases bien bacan y osea que sea objetivo porfa"
   - L2: The v0.1 brief and its planning predate this document (see git history and `pi-rich-renderer-brief.docx`, binary). This v0.2 revision
 reconciles the completed v0.1 record with the next phase set and is authored for tool-agnostic AI handoff.
   - L3 (user request, verbatim): "retoma el plan de odd? porfa mapea e inicia por donde se quedo"
   - L4: F0 resumed from an uncommitted partial state: build script and main/types already rewritten, esbuild resolving only transitively through vite, no doc evidence. F0.1-F0.3 completed and verified; F0.4 still open pending an interactive pi --extension load check. README install flows (jiti dev mode and symlink) stay valid; the shipped build is F5 work.
   - L5 (user request, verbatim): "ok porfa ya funciona el agente inicia el desarrollo"
   - L6: F1 closed with evidence. `registerMarkdownTransformer` transforms user and assistant markdown pre-render and is used by Pi core for its mermaid blocks, so inline text transformation is supported; it returns a string, so copy buttons and mouse targets remain overlay-only. Inline code/table/diff affordances are deferred to a v0.3 candidate with its own spec.
   - L7: F2.1-F2.3 delivered with RED-first evidence (16 clipboard tests failed before the implementation). A structural read-back then found four defects, fixed in the same unit: an explicit `PI_CLIPBOARD_OSC52` false value now vetoes SSH auto-detection, every clipboard test injects its own env and emit spy, and the README no longer overstates the OSC 52 opt-in or the suite coverage. F2.4 stays open.
   - L8: F2.4 field report — Windows clipboard turned `í` into `├¡`, the signature of UTF-8 bytes decoded through an OEM code page. Root cause: the Windows path piped raw UTF-8 text to PowerShell, whose stdin decode follows the console code page (measured `ibm850` here; `437`/`850` render `C3 AD` as `├¡`), and the old `$input` path additionally normalised line endings to CRLF. Fix: the payload now crosses the pipe as ASCII base64 and is decoded explicitly as UTF-8 inside PowerShell, with the injected-runner seam kept so unit tests still see the raw text. F2.4 stays open until the user confirms the paste.
   - L9: Test-harness lesson — the first integration read-back compared PowerShell stdout decoded as UTF-8 while PowerShell wrote cp850, which fabricated U+FFFD and hid the real result. Clipboard verification must cross the process boundary as ASCII base64 in both directions.
   - L10 (user confirmation): the pasted copy came back exactly as expected — "N'Símbolos: <>& | $() [] {}' AS PruebaSimbolos;" with the í intact and no ├¡, escaped quotes and angle brackets intact, empty lines and indentation preserved. F2.4 closed. The same report closed F0.4: `/rich` loaded from the source entrypoint and from the extension directory, with `dist` present and with `dist` removed, so `main` -> `dist/index.js` does not break directory installs.
   - L11: F3 slice 1 — keyboard parity and windowed scrolling. The viewport height comes from the overlay's TUI object (`tui.terminal.rows`, minus chrome), all five renderers now window their content through the shared `src/renderers/viewport.ts` rules, and the old ±1 clamping without a viewport is gone. Mouse (F3.1) is deliberately deferred: overlay mouse dispatch was proven reachable in fullscreen only, so it belongs to its own slice.
   - L12: F3 slice 1b — the `c` copy key is wired inside the overlay for all five renderers. It copies the block's raw source through the existing clipboard adapter and reports the result on the hint line (`Copied to clipboard`, or `Copy failed: <message>`), so no feedback depends on notify behaviour inside an overlay. F3.2 is now genuinely complete; mouse (F3.1) and the manual checklist plus README update (F3.4) remain.
   - L13: Field report — `/rich view` on a long block showed "..." instead of scrolling content; the reported cause was that content height was guessed as `rows - 4` from terminal size while the overlay provided less space. Runtime height is now derived once in `src/overlay-layout.ts` and reused for both renderer windowing and overlay `maxHeight`, so those values cannot disagree. The installed Pi compositor (`node_modules/@earendil-works/pi-tui/dist/tui.js:979-981`) caps by slicing lines and does not draw an ellipsis; the located "..." (`node_modules/@earendil-works/pi-tui/dist/components/editor.js:197-199`) is a narrow-width editor scroll-border fallback, so the installed source does not explain the reported ellipsis. A 30-row long-code render is exactly 24 lines, matching its cap, so Pi has no `maxHeight` overflow to slice; the mandated minimum cap can exceed the terminal only below 4 rows. Mouse and wheel input remain F3.1.
   - L14: field report — the ellipsis the user saw was horizontal truncation, not the vertical cap: long lines were cut by `truncateToWidth` with the rest of the line unreachable. All five renderers now scroll horizontally through a shared `src/renderers/hscroll.ts`, slicing the raw source by visible columns (wide characters count two) before colouring, so a line can be read to its end without ever slicing through an escape sequence. Vertical windowing from `overlay-layout.ts` is unchanged.
   - L15: F3.1 — mouse in the overlay. Wheel scrolls the window and a click on the right-aligned `[ copy ]` header label copies the block; every other click stays unhandled so Pi keeps drag selection. The plan named `MouseRegion`, but its declaration forwards only `render`, `handleMouse` and `invalidate`, so wrapping the component would have swallowed keyboard input; the components implement `handleMouse` directly instead, which Pi dispatches for overlays in fullscreen only (`tui.js:517 -> 526`), so regular mode is a silent no-op by construction.
   - L16: F3 closed. The README manual checklist now covers the overlay: no clipping at `maxHeight`, both scroll ends reachable, horizontal reading of wide lines with a fixed number gutter, `c` with its hint-line status, and mouse restricted to fullscreen. Component behavior is pinned by tests; the clipboard paste and the mouse paths still need a human pass in a real TUI.