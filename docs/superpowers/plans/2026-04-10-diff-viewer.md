# Edit/Write Diff Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an Edit/MultiEdit node is selected in the inspector, show a coloured line-by-line diff. Write/NotebookEdit nodes show the written content. Read nodes show the file response. All other tool calls keep the existing raw JSON view.

**Architecture:** `lib/diff.ts` computes `DiffLine[]` from old/new strings using LCS. `components/panels/DiffViewer.tsx` renders it. `NodeDetail.tsx` branches on `tool_name` and renders a `FileHeader` + the appropriate view. Pure client-side — no new API routes, no disk reads.

**Tech Stack:** Pure TypeScript LCS (no new deps), React, existing inline styles.

---

## File Map

| File | Action |
|---|---|
| `lib/diff.ts` | Create — LCS diff algorithm |
| `components/panels/DiffViewer.tsx` | Create — coloured diff renderer |
| `components/panels/NodeDetail.tsx` | Modify — branch on tool_name, add FileHeader |

---

### Task 1: `lib/diff.ts`

**Files:**
- Create: `lib/diff.ts`

- [ ] **Step 1: Create the file**

```ts
export type DiffLine = {
  type: "same" | "add" | "remove";
  text: string;
  oldNo: number | null;
  newNo: number | null;
};

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = 0, j = 0;
  let oldNo = 1, newNo = 1;

  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: "same", text: oldLines[i], oldNo: oldNo++, newNo: newNo++ });
      i++; j++;
    } else if (j < n && (i >= m || dp[i + 1][j] <= dp[i][j + 1])) {
      result.push({ type: "add", text: newLines[j], oldNo: null, newNo: newNo++ });
      j++;
    } else {
      result.push({ type: "remove", text: oldLines[i], oldNo: oldNo++, newNo: null });
      i++;
    }
  }

  return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify diff logic manually**

Add a temporary script `scripts/test-diff.mjs`:

```js
import { computeDiff } from "../lib/diff.ts";
// Can't import TS directly — verify by reading the logic instead.
// Quick mental check:
// computeDiff("a\nb\nc", "a\nx\nc")
// Expected: same "a", remove "b", add "x", same "c"
```

Actually, since there's no test runner, just verify the TypeScript compiles and the logic is correct by reading it.

- [ ] **Step 4: Commit**

```bash
git add lib/diff.ts
git commit -m "feat(diff): LCS line-diff utility"
```

---

### Task 2: `components/panels/DiffViewer.tsx`

**Files:**
- Create: `components/panels/DiffViewer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { DiffLine } from "@/lib/diff";

interface DiffViewerProps {
  diff: DiffLine[];
  maxHeight?: number;
}

const MONO = "'IBM Plex Mono', monospace";

export default function DiffViewer({ diff, maxHeight = 300 }: DiffViewerProps) {
  if (diff.length === 0) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>
        No changes
      </div>
    );
  }

  return (
    <div style={{
      overflowY: "auto",
      maxHeight,
      borderRadius: 12,
      border: "1px solid rgba(140,194,255,0.12)",
      background: "rgba(0,0,0,0.3)",
      marginBottom: 4,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 11 }}>
        <tbody>
          {diff.map((line, i) => {
            const bg =
              line.type === "add"    ? "rgba(74,222,128,0.10)" :
              line.type === "remove" ? "rgba(248,113,113,0.10)" :
              "transparent";
            const prefixColor =
              line.type === "add"    ? "#4ade80" :
              line.type === "remove" ? "#f87171" :
              "rgba(140,194,255,0.3)";
            const prefix =
              line.type === "add"    ? "+" :
              line.type === "remove" ? "−" :
              " ";

            return (
              <tr key={i} style={{ background: bg }}>
                {/* Old line number */}
                <td style={{
                  width: 28, textAlign: "right", paddingRight: 6, paddingLeft: 6,
                  color: "rgba(140,194,255,0.3)", userSelect: "none", verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {line.oldNo ?? ""}
                </td>
                {/* New line number */}
                <td style={{
                  width: 28, textAlign: "right", paddingRight: 8,
                  color: "rgba(140,194,255,0.3)", userSelect: "none", verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {line.newNo ?? ""}
                </td>
                {/* Prefix */}
                <td style={{
                  width: 14, color: prefixColor, userSelect: "none",
                  fontWeight: 700, verticalAlign: "top",
                  paddingTop: 2, paddingBottom: 2,
                }}>
                  {prefix}
                </td>
                {/* Line text */}
                <td style={{
                  color: line.type === "same" ? "#c5d5e8" : line.type === "add" ? "#4ade80" : "#f87171",
                  whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.55,
                  paddingTop: 2, paddingBottom: 2, paddingRight: 10,
                }}>
                  {line.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panels/DiffViewer.tsx
git commit -m "feat(diff): DiffViewer component with line numbers and colours"
```

---

### Task 3: Update `components/panels/NodeDetail.tsx`

**Files:**
- Modify: `components/panels/NodeDetail.tsx`

- [ ] **Step 1: Add imports**

At the top of `NodeDetail.tsx`, add:

```ts
import { computeDiff } from "@/lib/diff";
import DiffViewer from "@/components/panels/DiffViewer";
```

- [ ] **Step 2: Add FileHeader component**

Add this function inside the file (before `NodeDetail`):

```tsx
function FileHeader({ filePath, badge }: { filePath: string; badge?: string }) {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  const basename = lastSlash === -1 ? filePath : normalized.slice(lastSlash + 1);
  const dir = lastSlash === -1 ? "." : normalized.slice(0, lastSlash);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
          {basename}
        </span>
        {badge && (
          <span style={{
            fontFamily: MONO, fontSize: 9, color: "rgba(140,194,255,0.6)",
            background: "rgba(140,194,255,0.08)", border: "1px solid rgba(140,194,255,0.18)",
            borderRadius: 5, padding: "1px 6px",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)", marginTop: 2, wordBreak: "break-all" }}>
        {dir}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace the toolcall branch in NodeDetail**

Find the `if (type === "toolcall")` block. Replace the entire block with:

```tsx
if (type === "toolcall") {
  const toolName     = data.toolName as string;
  const toolInput    = data.toolInput as Record<string, unknown>;
  const toolResponse = data.toolResponse;
  const status       = data.status as string;
  const timestamp    = data.timestamp as number;

  // ── Edit / MultiEdit ────────────────────────────────────────────
  if (toolName === "Edit" || toolName === "MultiEdit") {
    const filePath = (toolInput.file_path as string) ?? "";

    if (toolName === "Edit") {
      const oldStr = typeof toolInput.old_string === "string" ? toolInput.old_string : null;
      const newStr = typeof toolInput.new_string === "string" ? toolInput.new_string : null;

      if (oldStr !== null && newStr !== null) {
        const diff = computeDiff(oldStr, newStr);
        return (
          <div style={{ fontFamily: MONO }}>
            <Badge status={status} />
            <FileHeader filePath={filePath} />
            <DiffViewer diff={diff} />
            <Timestamp ts={timestamp} />
          </div>
        );
      }
    }

    if (toolName === "MultiEdit") {
      const edits = Array.isArray(toolInput.edits) ? toolInput.edits as Array<{ old_string?: string; new_string?: string }> : [];
      return (
        <div style={{ fontFamily: MONO }}>
          <Badge status={status} />
          <FileHeader filePath={filePath} />
          {edits.map((edit, i) => {
            const diff = computeDiff(edit.old_string ?? "", edit.new_string ?? "");
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4 }}>
                  Edit {i + 1} of {edits.length}
                </div>
                <DiffViewer diff={diff} />
              </div>
            );
          })}
          <Timestamp ts={timestamp} />
        </div>
      );
    }
  }

  // ── Write / NotebookEdit ─────────────────────────────────────────
  if (toolName === "Write" || toolName === "NotebookEdit") {
    const filePath = (toolInput.file_path ?? toolInput.notebook_path ?? "") as string;
    const content  = typeof toolInput.content === "string" ? toolInput.content : JSON.stringify(toolInput.content, null, 2);
    return (
      <div style={{ fontFamily: MONO }}>
        <Badge status={status} />
        <FileHeader filePath={filePath} badge="Written" />
        <CodeBlock>{content}</CodeBlock>
        <Timestamp ts={timestamp} />
      </div>
    );
  }

  // ── Read ─────────────────────────────────────────────────────────
  if (toolName === "Read") {
    const filePath = (toolInput.file_path as string) ?? "";
    const content  = typeof toolResponse === "string" ? toolResponse : JSON.stringify(toolResponse, null, 2);
    return (
      <div style={{ fontFamily: MONO }}>
        <Badge status={status} />
        <FileHeader filePath={filePath} badge="Read" />
        {toolResponse !== undefined ? (
          <CodeBlock>{content}</CodeBlock>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 11 }}>No response yet</div>
        )}
        <Timestamp ts={timestamp} />
      </div>
    );
  }

  // ── Default: all other tool calls ────────────────────────────────
  return (
    <div style={{ fontFamily: MONO }}>
      <Badge status={status} />
      <Label open={inputOpen} onToggle={() => setInputOpen(o => !o)}>Input</Label>
      {inputOpen && (
        <CodeBlock>{JSON.stringify(toolInput, null, 2)}</CodeBlock>
      )}
      {toolResponse !== undefined && (
        <>
          <Label open={outputOpen} onToggle={() => setOutputOpen(o => !o)}>Output</Label>
          {outputOpen && (
            <CodeBlock>
              {typeof toolResponse === "string" ? toolResponse : JSON.stringify(toolResponse, null, 2)}
            </CodeBlock>
          )}
        </>
      )}
      <Timestamp ts={timestamp} />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual end-to-end test**

1. Start server: `node bin/cc-visualizer.js`
2. Run Claude Code — trigger an Edit tool call (e.g., ask Claude to edit a file)
3. Click the Edit node in the graph
4. Inspector should show: Badge, file path header, coloured diff (red removed lines, green added lines)
5. Click a Write node — should show file path header with "Written" badge and full content
6. Click a Read node — should show file path header with "Read" badge and response content
7. Click a Bash node — should still show the old Input/Output JSON blocks

- [ ] **Step 6: Commit**

```bash
git add lib/diff.ts components/panels/DiffViewer.tsx components/panels/NodeDetail.tsx
git commit -m "feat(diff): Edit/Write/Read inspector views with line diff"
```
