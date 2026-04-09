# cc-visualizer

Real-time 3D visualizer for Claude Code sessions. See every tool call, subagent spawn, notification, and stop event as a live force-directed graph in your browser — zero config.

## Quick start

```bash
npx cc-visualizer
```

This will:
1. Add Claude Code hooks to `~/.claude/settings.json` (PreToolUse, PostToolUse, Notification, Stop, SubagentStop)
2. Start the visualizer server on port 3000
3. Open `http://localhost:3000` in your browser

Then run Claude Code in any project — events stream in live.

## Options

```bash
npx cc-visualizer --port=4000       # use a different port
npx cc-visualizer --no-open         # don't open the browser
npx cc-visualizer --no-hooks        # skip hook installation (server only)
npx cc-visualizer --uninstall       # remove hooks from Claude settings and exit
```

## What it shows

- **3D force graph** — tool calls, notifications, and stop events as nodes
- **Node color** — by tool name (deterministic, consistent across sessions)
- **Node size** — by duration (larger = slower)
- **Status rings** — pulsing amber for in-progress, red for errors, green for start
- **Agents & Skills panel** — subagents spawned, skills invoked, top tools by call count
- **Sessions panel** — all active sessions with child subagent hierarchy
- **Event feed** — live scrolling event log
- **Heatmap mode** — color nodes by duration (green→amber→red)
- **Search** — filter nodes by tool name
- **Playback** — replay a session node by node at variable speed
- **Diff** — shift-click two nodes to compare their inputs/outputs side by side
- **Bookmarks** — star any node, jump back to it later
- **Export** — save the current view as PNG or the session as JSON

## How hooks work

The CLI adds one curl command to each Claude hook event:

```
curl -sf -X POST http://localhost:3000/api/hooks \
  -H 'Content-Type: application/json' \
  --data-binary @- --max-time 2 2>/dev/null || true
```

It appends to your existing hooks — it won't replace or remove anything else. The `|| true` ensures Claude is never blocked if the visualizer isn't running.

Run `npx cc-visualizer --uninstall` to remove just the cc-visualizer hooks.

## Development

```bash
git clone https://github.com/chettiarachchi/cc-visualizer
cd cc-visualizer
npm install
npm run dev
```

The dev server auto-detects that you're running from source and skips the standalone build.

## Building for publish

```bash
npm run build     # next build + copies static assets into standalone dir
npm publish
```
