# Edit/Write Diff Viewer Design

**Goal:** When an Edit, Write, or Read node is selected in the inspector, show a meaningful visual representation of what Claude actually did to the file — not raw JSON.

**Architecture:** Pure client-side. A new `lib/diff.ts` utility computes line diffs from `tool_input` fields already present in the event payload. A new `DiffViewer` component renders the diff. `NodeDetail` branches on `tool_name` to select the right view. No new API routes, no disk reads.

**Tech Stack:** Pure TypeScript LCS diff (no new deps), React, existing inline styles.

---

## `lib/diff.ts`

```ts
export type DiffLine = {
  type: "same" | "add" | "remove";
  text: string;
  lineNo: { old: number | null; new: number | null };
};

export function computeDiff(oldText: string, newText: string): DiffLine[]
```

Algorithm: standard LCS (longest common subsequence) on lines. Splits both strings by `\n`, builds LCS table, backtracks to produce `DiffLine[]`. Pure function, no side effects.

**Edge cases:**
- Empty `oldText` → all lines are `add`
- Empty `newText` → all lines are `remove`
- Identical strings → all lines are `same`
- Lines longer than 300 chars are truncated with `…` for rendering (full text preserved in data)

---

## `components/panels/DiffViewer.tsx`

Props:
```ts
interface DiffViewerProps {
  diff: DiffLine[];
  maxHeight?: number;  // default 300
}
```

Renders a scrollable code block. Each line:

```
 gutter  │  prefix  text
─────────────────────────
   1   2  │  (muted)  unchanged line
   3      │  −        removed line       ← rgba(248,113,113,0.12) background, #f87171 text for prefix
      4   │  +        added line         ← rgba(74,222,128,0.12) background, #4ade80 text for prefix
```

- Font: IBM Plex Mono, 11px
- Gutter shows old line number (left col) and new line number (right col), muted, 3-char wide each
- Prefix `+` / `−` / ` ` in a fixed 2-char column
- Lines wrap with `pre-wrap`
- Outer div: `overflowY: auto`, `maxHeight` prop, `borderRadius: 12`, `border: 1px solid rgba(140,194,255,0.12)`, `background: rgba(0,0,0,0.3)`
- If `diff.length === 0`: render "No changes" in muted text

---

## `NodeDetail.tsx` changes

Branch on `tool_name` inside the `type === "toolcall"` block. Replace the generic Input/Output CodeBlocks for file tools with purpose-built views.

### Edit / MultiEdit

`tool_input` shape: `{ file_path: string, old_string: string, new_string: string, ... }`

For `MultiEdit`, `tool_input.edits` is an array of `{ old_string, new_string }`. Render one diff block per edit, numbered.

```
┌─ components/panels/NodeDetail.tsx (Edit branch) ──────────────────┐
│  FileHeader  path/to/file.ts                                       │
│  DiffViewer  [computeDiff(old_string, new_string)]                 │
│  Timestamp                                                         │
└───────────────────────────────────────────────────────────────────┘
```

### Write / NotebookEdit

`tool_input` shape: `{ file_path: string, content: string }`

No diff (Write creates/overwrites without a known before state). Show the written content.

```
┌─ components/panels/NodeDetail.tsx (Write branch) ─────────────────┐
│  FileHeader  path/to/file.ts  [Written]                            │
│  CodeBlock   tool_input.content                                    │
│  Timestamp                                                         │
└───────────────────────────────────────────────────────────────────┘
```

### Read

`tool_input` shape: `{ file_path: string, ... }`  
`tool_response`: string (file contents)

```
┌─ components/panels/NodeDetail.tsx (Read branch) ──────────────────┐
│  FileHeader  path/to/file.ts  [Read]                               │
│  CodeBlock   tool_response (string)                                │
│  Timestamp                                                         │
└───────────────────────────────────────────────────────────────────┘
```

### All other tool calls

Existing behaviour: collapsible Input (JSON) + collapsible Output (JSON).

---

## `FileHeader` sub-component

Small inline component used by all three branches above:

```ts
function FileHeader({ path, badge }: { path: string; badge?: string })
```

Renders the file path (basename bold, directory muted) with an optional badge ("Written", "Read"). Same eyebrow style as the rest of NodeDetail.

---

## Error Handling

- If `old_string` or `new_string` is missing on an Edit node, fall back to raw JSON view
- If `content` is missing on a Write node, fall back to raw JSON view
- `computeDiff` never throws — returns `[]` on any unexpected input

---

## Out of Scope

- Syntax highlighting (no new deps)
- Reading the actual file from disk for context
- Showing surrounding unchanged lines (full file context)
- Diffing binary files
