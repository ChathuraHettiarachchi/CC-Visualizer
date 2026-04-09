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
