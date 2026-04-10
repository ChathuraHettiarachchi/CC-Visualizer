# cc-visualizer

Real-time 3D visualizer for Claude Code sessions. Watch every tool call, subagent spawn, file edit, notification, and stop event flow live as a force-directed graph — zero configuration required.

```bash
npx cc-visualizer
```

---

## Why does this exist?

Two reasons.

**Curiosity.** Claude Code does a lot behind the scenes. Tool calls, subagents, context accumulation, error retries — it's hard to reason about what's actually happening from terminal output alone. A visual that shows structure, timing, and cost in real time makes the machine legible.

**Stress-testing the PAUL framework.** PAUL (Plan → Apply → Unify → Learn) is a development loop for working with AI agents. This project was built almost entirely using PAUL, and used as a real-world test of how well the framework holds up under a moderately complex Next.js project. The answer: pretty well, with some rough edges.

---

## Quick start

```bash
npx cc-visualizer
```

This will:
1. Install Claude Code hooks into `~/.claude/settings.json` (PreToolUse, PostToolUse, Notification, Stop, SubagentStop)
2. Start the visualizer server on port 7331
3. Open `http://localhost:7331` in your browser

Then run Claude Code anywhere — events stream in live.

### Options

```bash
npx cc-visualizer --port=4000   # different port
npx cc-visualizer --no-open     # don't auto-open browser
npx cc-visualizer --no-hooks    # server only, skip hook install
npx cc-visualizer --uninstall   # remove cc-visualizer hooks and exit
```

### How hooks work

The CLI appends one `curl` command to each Claude hook event in your settings:

```sh
curl -sf -X POST http://localhost:7331/api/hooks \
  -H 'Content-Type: application/json' \
  --data-binary @- --max-time 2 2>/dev/null || true
```

It is **non-destructive** — it appends to existing hooks rather than replacing them. The `|| true` ensures Claude is never blocked if the visualizer isn't running. Run `--uninstall` to cleanly remove just the cc-visualizer entries.

---

## UI overview

The interface is split into four areas.

---

### Left rail

The left column covers session management and session-level analytics.

**Sessions panel** — two tabs:
- *Live* lists all active Claude Code processes. Each session shows an event count, tool call count, and subagent count as colored chips. Child subagents appear indented under their parent.
- *History* lists past sessions saved to disk. Click any entry to load it in read-only mode; the ✕ button deletes it permanently.

**Agents & Skills panel** — a summary of what the agent has done this session: how many subagents were spawned, which skills were invoked, and a top-5 table of tool calls by frequency.

**Waterfall panel** — a horizontal Gantt chart of tool call timing. Each unique tool gets one row; each invocation is a colored bar positioned on a shared timeline. Hover a bar to see its duration. Useful for spotting which tools dominate session time.

**Patterns panel** — automatically flags suspicious or notable behavioral patterns in the event stream:
- `read-edit-loop` — the same file was read then edited 3+ times, suggesting the agent is struggling with a particular file
- `error-retry` — the same tool was called again immediately after returning an error
- `long-chain` — 20+ consecutive tool calls without a session stop, indicating a long uninterrupted run
- `repeated-failures` — 3+ consecutive errors across any tools, suggesting something is systematically broken

Each pattern card shows a description and links to the specific nodes involved; clicking a node ID jumps the inspector to it.

---

### Graph canvas (center)

The main area where the session plays out visually.

**3D force graph (default)** — nodes are tool calls, notifications, and stop events. Edges connect them in the order they occurred. The simulation runs a physics layout so related calls cluster naturally.

- Node color is deterministic per tool name (e.g. all `Read` calls are the same shade across all sessions)
- Node size scales with duration: larger = slower
- Status rings pulse around nodes: amber = still running, red = returned an error, green = the session's first node
- Hover a node to see a tooltip with the tool name and input parameters

**2D flow view** — toggle the `⊞ 2D` button to switch to a flat grid layout. Nodes are arranged in a boustrophedon (snake) pattern in arrival order, numbered, with the tool name and duration below. Easier to read for long sessions where the 3D graph becomes cluttered.

**Heatmap mode** — toggle `○ Heatmap` to recolor all nodes from green (fast) to red (slow) based on their duration relative to the session min/max. Good for quickly spotting the slow tool calls.

**Search** — type in the search box to filter nodes. Non-matching nodes fade out in both 3D and 2D views.

**Controls (top-right):**
- `↓ PNG` — save a screenshot of the current canvas
- `↓ JSON` — download all raw events for the active session
- `↓ Summary` — generate and download a Markdown summary of the session (tool counts, files, errors, cost)

**Playback controls (bottom center):**
- `▶ Replay Session` — steps through nodes one at a time in arrival order, selecting each in the inspector
- Speed buttons (0.5×, 1×, 2×, 4×) and a stop button appear during playback

**Navigation:**
- Arrow keys step backward/forward through nodes
- ⌘K / Ctrl+K opens a command palette to jump to any node by name
- Escape deselects the current node

---

### Event feed (bottom of center)

A compact table showing every event in reverse chronological order. Columns:

| Column | What it shows |
|---|---|
| Time | Wall-clock time the event was received |
| Type | PreToolUse, PostToolUse, Notification, Stop, etc. |
| Tool / Content | Tool name for tool calls; message text for notifications |
| File | The file path the tool operated on, if applicable |
| Dur | How long the tool call took (PreToolUse + PostToolUse delta) |
| Status | ✓ complete, ✗ error, … still running |

PostToolUse events are merged into their corresponding PreToolUse row — so each tool call appears as a single row, not two.

---

### Right rail

The right column is per-node inspection and session stats.

**Stats panel** — six tiles showing session-level numbers:
- *Events* — total event count for the active session
- *Tools* — number of tool calls (PreToolUse events)
- *Active* — the tool name currently in-flight, or — if nothing is running
- *~Cost* — estimated total session cost in USD, computed by walking each tool call turn and treating the full accumulated context as the API input (more realistic than just counting tool parameters)
- *~In tok* — estimated total input tokens across all turns
- *~Out tok* — estimated total output tokens across all turns

Below the tiles, a context window bar shows approximately how full the 200k-token context window is, colored green → amber → red as it fills.

**Inspector panel** — shows the details of whichever node is selected on the graph:
- `Edit` / `MultiEdit` calls render a side-by-side line diff with old/new line numbers and +/− color coding
- `Write` / `NotebookEdit` calls show the file path and the full content written
- `Read` calls show the file path and the response content
- All other tool calls show collapsible Input / Output JSON blocks
- Shift-clicking a second node while one is already selected switches the inspector to a side-by-side diff of both nodes' inputs/outputs

The bookmark button (★) at the top of the inspector saves the current node so you can jump back to it.

**Timeline panel** — a scrollable chronological list of all events in the session, with the currently selected node highlighted. Useful for seeing where a selected node sits in the overall flow.

**Errors panel** — shows only tool calls that returned an error response (detected by heuristic: response text contains "error", "exception", "failed", or "traceback"). Each entry has a jump button to select that node on the graph.

**Files panel** — a file-access heatmap: lists every file the agent touched, sorted by access count. The bar width represents relative frequency.

**Bookmarks panel** — lists all nodes you've starred in the current session. Click any entry to select it; the ✕ button removes the bookmark.

---

## What's great

- **Zero config** — one `npx` command, hooks install themselves, events just appear
- **Non-destructive** — hooks are appended, not replaced; `--uninstall` removes only what was added
- **All local** — no external services, no telemetry, no accounts; everything runs on your machine
- **Diff-first inspector** — Edit/MultiEdit calls show actual diffs, not raw JSON blobs
- **Session history** — past sessions survive server restarts and can be replayed
- **Pattern detection** — surfaces things that are hard to notice in terminal output (error loops, long chains)
- **Built with itself** — development used cc-visualizer to watch cc-visualizer being built, which gave immediate feedback on what the inspector needed to show

## What's not great

- **Approximate token counts** — uses chars ÷ 4 as a proxy; real tokenization differs per model and content type
- **Hardcoded pricing** — $3/Mtok input, $15/Mtok output; won't stay accurate as pricing changes
- **3D graph gets noisy** — sessions with 100+ tool calls produce a graph that's hard to navigate; a 2D layout or clustering would help
- **Heuristic pattern detection** — thresholds (3 ops, 20 calls, etc.) are guesses; false positives happen
- **No syntax highlighting** — code blocks in the inspector are plain monospace; a Shiki or Prism pass would help readability
- **Session IDs, not names** — the history list shows hex IDs, not human-readable names; no way to rename a session
- **Single user, single machine** — the server is localhost-only; no auth, no sharing, no multi-user

---

## Architecture

```
cc-visualizer/
├── app/
│   ├── api/
│   │   ├── hooks/          # POST — receives Claude hook events
│   │   ├── events/         # GET  — SSE stream of live events
│   │   └── sessions/
│   │       └── saved/      # GET (list), GET /:id, DELETE /:id
│   └── page.tsx            # root page — wires everything together
│
├── components/
│   ├── canvas/
│   │   └── GraphCanvas.tsx # 3D force graph, keyboard nav, command palette
│   ├── layout/
│   │   ├── LeftRail.tsx    # sessions, agents, waterfall, patterns
│   │   ├── RightRail.tsx   # stats, inspector, timeline, errors, files, bookmarks
│   │   └── Topbar.tsx      # session label, export controls, alert settings
│   └── panels/
│       ├── InspectorPanel.tsx
│       ├── NodeDetail.tsx   # per-node rendering: diffs, file views, raw JSON
│       ├── DiffViewer.tsx   # line-level diff renderer
│       ├── EventFeed.tsx    # bottom bar — columnar event log
│       ├── WaterfallPanel.tsx
│       ├── PatternPanel.tsx
│       └── ...
│
├── lib/
│   ├── event-store.ts      # in-memory ring buffer + persistence bridge
│   ├── session-store.ts    # NDJSON read/write/list/delete
│   ├── diff.ts             # LCS diff algorithm
│   ├── context-estimate.ts # token usage estimation
│   ├── detect-patterns.ts  # behavioral pattern detection
│   ├── generate-summary.ts # Markdown summary generator
│   ├── alerts.ts           # alert config + threshold checking
│   └── bookmarks.ts        # localStorage bookmark store
│
└── hooks/
    ├── useSSE.ts           # EventSource connection + session tracking
    ├── useSavedSessions.ts # fetch/refresh/delete saved sessions
    └── useAlerts.ts        # cost + error threshold alerts
```

Events flow: Claude Code → hook curl → `/api/hooks` → `event-store` (ring buffer + NDJSON append) → SSE `/api/events` → `useSSE` → React state → graph + panels.

---

## Built with the PAUL framework

PAUL is a personal development loop for AI-assisted projects:

- **Plan** — write an explicit phase plan with tasks, acceptance criteria, and verification steps
- **Apply** — execute the plan task by task, using subagent-driven development for implementation
- **Unify** — review what was built against the plan, note what drifted
- **Learn** — update the framework and patterns based on what worked

cc-visualizer was built across several PAUL phases, each targeting a slice of functionality. The `.paul/` directory in the repo contains the phase plans, state, and roadmap used during development.

The experience validated that PAUL works well for scoped feature work but needs better tooling for cross-phase context — which is part of why the visualizer exists.

---

## Development

```bash
git clone https://github.com/your-username/cc-visualizer
cd cc-visualizer
npm install
npm run dev
```

The dev server starts at `http://localhost:7331`. To send test events without running Claude Code, POST to `/api/hooks` with a JSON body matching the `ClaudeEvent` shape in `lib/types.ts`.

---

## License

MIT
