import { mkdirSync, appendFileSync, readdirSync, statSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import type { ClaudeEvent } from "@/lib/types";

const SESSION_DIR = path.resolve(process.cwd(), ".cc-visualizer", "sessions");
const MAX_SESSIONS = 50;

export interface SessionMeta {
  id: string;
  startTime: number;
  endTime: number;
  eventCount: number;
}

function resolveSessionPath(id: string): string {
  const filePath = path.resolve(SESSION_DIR, `${id}.ndjson`);
  if (!filePath.startsWith(SESSION_DIR + path.sep) && filePath !== SESSION_DIR) {
    throw new Error("Invalid session id");
  }
  return filePath;
}

export function initSessionDir(): void {
  mkdirSync(SESSION_DIR, { recursive: true });
}

export function appendEvent(event: ClaudeEvent): void {
  try {
    initSessionDir();
    const filePath = resolveSessionPath(event.session_id);
    // Check if this is a new session file (to decide whether to prune)
    let isNewFile = false;
    try {
      statSync(filePath);
    } catch {
      isNewFile = true;
    }
    appendFileSync(filePath, JSON.stringify(event) + "\n", "utf8");
    if (isNewFile) {
      pruneOldSessions();
    }
  } catch (err) {
    console.warn("[session-store] Failed to append event:", err);
  }
}

export function listSessions(): SessionMeta[] {
  try {
    initSessionDir();
    const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith(".ndjson"));
    const metas: SessionMeta[] = [];
    for (const file of files) {
      const filePath = path.join(SESSION_DIR, file);
      try {
        const stat = statSync(filePath);
        const content = readFileSync(filePath, "utf8");
        const lines = content.trim().split("\n").filter(Boolean);
        if (lines.length === 0) continue;
        const firstEvent = JSON.parse(lines[0]) as ClaudeEvent;
        if (typeof firstEvent.timestamp !== "number") continue;
        metas.push({
          id: file.replace(".ndjson", ""),
          startTime: firstEvent.timestamp,
          endTime: stat.mtimeMs,
          eventCount: lines.length,
        });
      } catch {
        // skip unparseable files
      }
    }
    return metas.sort((a, b) => b.startTime - a.startTime);
  } catch {
    return [];
  }
}

export function loadSession(id: string): ClaudeEvent[] {
  const filePath = resolveSessionPath(id);
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Session not found: ${id}`);
    }
    throw err;
  }
  const result: ClaudeEvent[] = [];
  for (const line of content.trim().split("\n").filter(Boolean)) {
    try {
      result.push(JSON.parse(line) as ClaudeEvent);
    } catch {
      // skip bad lines
    }
  }
  return result;
}

export function deleteSession(id: string): void {
  const filePath = resolveSessionPath(id);
  try {
    unlinkSync(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Session not found: ${id}`);
    }
    throw err;
  }
}

function pruneOldSessions(): void {
  try {
    const files = readdirSync(SESSION_DIR)
      .filter((f) => f.endsWith(".ndjson"))
      .map((f) => ({ f, mtime: statSync(path.join(SESSION_DIR, f)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime);
    while (files.length > MAX_SESSIONS) {
      const oldest = files.shift()!;
      unlinkSync(path.join(SESSION_DIR, oldest.f));
    }
  } catch (err) {
    console.warn("[session-store] Failed to prune sessions:", err);
  }
}
