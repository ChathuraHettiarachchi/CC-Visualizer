import { existsSync, mkdirSync, appendFileSync, readdirSync, statSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import type { ClaudeEvent } from "@/lib/types";

const SESSION_DIR = path.join(process.cwd(), ".cc-visualizer", "sessions");
const MAX_SESSIONS = 50;

export interface SessionMeta {
  id: string;
  startTime: number;
  endTime: number;
  eventCount: number;
}

export function initSessionDir(): void {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export function appendEvent(event: ClaudeEvent): void {
  try {
    initSessionDir();
    const filePath = path.join(SESSION_DIR, `${event.session_id}.ndjson`);
    appendFileSync(filePath, JSON.stringify(event) + "\n", "utf8");
    pruneOldSessions();
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
      const stat = statSync(filePath);
      const content = readFileSync(filePath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      if (lines.length === 0) continue;
      try {
        const firstEvent = JSON.parse(lines[0]) as ClaudeEvent;
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
  const filePath = path.join(SESSION_DIR, `${id}.ndjson`);
  if (!existsSync(filePath)) throw new Error(`Session not found: ${id}`);
  const content = readFileSync(filePath, "utf8");
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
  const filePath = path.join(SESSION_DIR, `${id}.ndjson`);
  if (!existsSync(filePath)) throw new Error(`Session not found: ${id}`);
  unlinkSync(filePath);
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
