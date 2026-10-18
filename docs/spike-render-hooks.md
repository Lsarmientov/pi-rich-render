# Spike: assistant markdown render hooks (F1)

Status: decided. Phase F1 of `odd/tasks/pi-rich-renderer.md`.
Verdict: **INLINE-OK** for text/ANSI block transformation; **OVERLAY-ONLY** for interactive affordances.

## Question

Can a Pi extension render or intercept assistant message or markdown blocks per block, or is the command-plus-overlay model the only supported path?

## Method

Read the installed Pi documentation and the published typings, plus the compiled runtime of the newer copy to see how Pi core wires the hooks itself. Two installs were inspected, and their doc line numbers matched on every quote below:

- **D1** = repo-local `node_modules/@earendil-works/pi-coding-agent` (v1.2.0)
- **D2** = global pnpm install of the same package (v1.3.0)
- **T1** = repo-local `node_modules/@earendil-works/pi-tui`

Surface searched: every `docs/*.md` in D1 and D2, every `dist/**/*.d.ts` in D1 and T1, and the compiled runtime in D2. `node_modules` is gitignored, so line numbers are cited by file and line, not by URL.

## Evidence

### 1. Documented render hooks cover tool calls, not assistant blocks

- `D1/docs/extensions.md:193` — "A tool's `renderCall` and `renderResult` draw its calls in the interactive transcript and in HTML exports. `pi.registerToolRenderer((toolName, next) => renderers)` chooses renderers for calls to any tool".
- `D1/docs/extensions.md:238` — "Register an entry or message renderer when custom stored content should appear in the transcript."

Tool-call rendering is documented. Assistant markdown block rendering is not.

### 2. An assistant markdown transformer exists in the published typings

- `D1/dist/core/extensions/types.d.ts:1165` — `export type MarkdownTransformer = (markdown: string, context: MarkdownTransformContext) => string;`
- `D1/dist/core/extensions/types.d.ts:1160-1164` — `MarkdownTransformContext` carries `messageType: "user" | "assistant" | "assistant-thinking"`, `isStreaming: boolean`, `availableWidth: number`.
- `D1/dist/core/extensions/types.d.ts:1251-1252` — "Register a transformer for user and assistant Markdown before Pi renders it in the interactive transcript." (`registerMarkdownTransformer(transformer: MarkdownTransformer): void`)

This is the decisive hit: an extension can transform assistant markdown before rendering, per message, with streaming state and the available width.

### 3. Component renderers apply to custom messages and custom entries only

- `D1/dist/core/extensions/types.d.ts:1169` and `:1249-1250` — `MessageRenderer<T>` + "Register a custom renderer for CustomMessageEntry."
- `D1/dist/core/extensions/types.d.ts:1170` and `:1253-1254` — `EntryRenderer` + `registerEntryRenderer`, for custom session entries that "do not participate in LLM context".
- `D2/dist/modes/interactive/interactive-mode.js:3162-3165` — the message-renderer path is reached only for `case "custom"`.

No `renderBlock`, no assistant-message Component hook: NOT FOUND in docs or typings.

### 4. Pi core itself uses the transformer, so the path is exercised

- `D2/dist/modes/interactive/interactive-mode.js:1709` — the markdown transformer list starts with core's own `mermaidMarkdownTransformer`.
- `D2/dist/modes/interactive/interactive-mode.js:3219` — `AssistantMessageComponent(message, ..., this.getMarkdownTransformers())`.
- `D2/dist/modes/interactive/components/mermaid.js:45-46` — "Create a transformer that replaces top-level Mermaid code blocks with Unicode terminal diagrams", running while `context.isStreaming` (`:51`).

The built-in mermaid transformer is the working precedent for exactly our use case: find a fenced block in assistant markdown and substitute terminal text for it.

### 5. Overlays and mouse

- `D1/docs/tui.md:66` — "`ctx.ui.custom()` temporarily gives one component control of the interactive area and resolves when that component calls the supplied completion callback."
- `D1/docs/tui.md:68` — "Pass `overlay: true` to draw above existing content."
- `D1/docs/tui.md:70` — "Focused overlays retain input ownership across ordinary renders."
- `D1/docs/tui.md:58` — "Fullscreen mode routes normalized mouse events to components."
- `D1/docs/tui.md:62` — "Regular mode leaves mouse input to the terminal because the terminal owns scrollback."
- `T1/dist/tui.d.ts:77-78` — optional `handleMouse?(event: TuiMouseEvent)`.

Mouse affordances therefore exist only where Pi routes mouse events, which is fullscreen mode (the default per `D1/docs/settings.md:96`), and a component outside fullscreen receives none.

### 6. Documentation gap (risk, not blocker)

A search for "Transformer" across `D1/docs` returns no matches. `registerMarkdownTransformer` and `registerMessageRenderer` are exported in the published typings and used by core, but they are not described in `docs/*.md`; only `registerEntryRenderer` appears there (`D1/docs/session-format.md:172`).

## Verdict

**INLINE-OK**, scoped precisely: text and ANSI transformation of user and assistant markdown before Pi renders it is a supported extension hook, exercised by Pi core itself.

**OVERLAY-ONLY**, equally precisely: the transformer returns a `string`. It cannot insert a `Component`, a focusable or clickable copy button, or mouse targets into the assistant transcript. Every interactive affordance stays in the `ctx.ui.custom` overlay.

### What the hook can and cannot do

| Capability | Inline transformer | Overlay |
| --- | --- | --- |
| Restyle a fenced block with ANSI (colors, gutters, line numbers) | yes | yes |
| Replace a block's visible text (collapsed summary, diagram substitute) | yes | yes |
| Read `isStreaming` and `availableWidth` | yes | n/a |
| Insert a clickable or focusable control | no | yes, in fullscreen only |
| Own input, scroll, or focus | no | yes |
| Receive mouse events | no | yes, in fullscreen only |

## Consequences for the plan

- **F3 (expanded viewer)**: unchanged. Mouse click targets and scrolling stay in the overlay, fullscreen only, with keyboard parity.
- **F4 (format coverage)**: each renderer may additionally register a transformer to improve inline reading (diff colors, JSON pretty-printing inside the transcript), but must degrade to plain text and must never be the path that copying depends on.
- **F2 (clipboard)**: unaffected. Copying stays `/rich copy` and the overlay's copy action; no inline copy button exists to wire.
- **New candidate for v0.3, not part of this plan**: an opt-in inline transformer for code, table and diff blocks. It is not scheduled here because it rewrites the assistant transcript, which is user-visible behavior on an API that the docs do not describe; it needs its own spec, a settings flag, and a runtime feature detect.

## Risks and limits of this verdict

- The API is exported in the published typings but absent from `docs/*.md`. Treat it as a typings contract, not a documented feature: feature-detect it (`typeof registerMarkdownTransformer === "function"`) before registering anything, and pin the Pi dependency, currently the wildcard `*`.
- Version drift exists in this workspace: D1 is v1.2.0 while the global CLI is v1.3.0. Re-verify at F5 (packaging/pinning) and F6 (release).
- Nothing here was derived from private internals: only the exported registry method, behind a feature detect.

## What would change the verdict

- A documented Component-returning renderer for assistant messages, or a `MarkdownTransformer` allowed to return components: the inline verdict then extends to interactive blocks and F3 could be revisited.
- Removal of `registerMarkdownTransformer` from the published typings.
- Pi core dropping its internal mermaid transformer, which is the precedent that proves the path works during streaming.
