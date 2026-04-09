export interface Bookmark {
  nodeId: string;
  nodeType: string | undefined;
  label: string;
  note: string;
  timestamp: number;
}

const key = (sessionId: string) => `cc-bookmarks-${sessionId}`;

export function getBookmarks(sessionId: string): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(key(sessionId)) ?? "[]");
  } catch { return []; }
}

export function addBookmark(sessionId: string, bookmark: Bookmark): void {
  const existing = getBookmarks(sessionId).filter(b => b.nodeId !== bookmark.nodeId);
  localStorage.setItem(key(sessionId), JSON.stringify([...existing, bookmark]));
}

export function removeBookmark(sessionId: string, nodeId: string): void {
  const existing = getBookmarks(sessionId).filter(b => b.nodeId !== nodeId);
  localStorage.setItem(key(sessionId), JSON.stringify(existing));
}

export function isBookmarked(sessionId: string, nodeId: string): boolean {
  return getBookmarks(sessionId).some(b => b.nodeId === nodeId);
}
