export type HookEventName =
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "Stop"
  | "SubagentStop";

interface BaseEvent {
  session_id: string;
  timestamp: number; // added by hook server on receipt
}

export interface PreToolUseEvent extends BaseEvent {
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id: string;
}

export interface PostToolUseEvent extends BaseEvent {
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: unknown;
  tool_use_id: string;
}

export interface NotificationEvent extends BaseEvent {
  hook_event_name: "Notification";
  message: string;
}

export interface StopEvent extends BaseEvent {
  hook_event_name: "Stop" | "SubagentStop";
}

export type ClaudeEvent =
  | PreToolUseEvent
  | PostToolUseEvent
  | NotificationEvent
  | StopEvent;

// Client-side wrapper — not a wire type.
// TODO: activate by changing eventsBySession to Map<string, SessionEvent[]> in useSSE
// so consumers can distinguish subagent events from parent events.
export interface SessionEvent {
  event: ClaudeEvent;
  isSubagent: boolean;
}
