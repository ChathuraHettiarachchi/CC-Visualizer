import { EventEmitter } from "events";
import type { ClaudeEvent } from "./types";
import { appendEvent as persistEvent } from "@/lib/session-store";

const RING_BUFFER_MAX = 500;

declare global {
  // eslint-disable-next-line no-var
  var __eventBus: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __events: ClaudeEvent[] | undefined;
}

// Persist across Next.js HMR hot reloads
export const eventBus: EventEmitter =
  globalThis.__eventBus ?? (globalThis.__eventBus = new EventEmitter());

export const events: ClaudeEvent[] =
  globalThis.__events ?? (globalThis.__events = []);

eventBus.setMaxListeners(200);

export function pushEvent(event: ClaudeEvent): void {
  events.push(event);
  if (events.length > RING_BUFFER_MAX) {
    events.splice(0, 1);
  }
  persistEvent(event);
  eventBus.emit("event", event);
}
