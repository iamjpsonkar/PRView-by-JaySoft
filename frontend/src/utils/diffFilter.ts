/**
 * Extracts only the "existing" (old) or "modified" (new) side from a unified diff.
 * Returns a pseudo-diff that shows only the selected side as plain content.
 */
export function filterDiffSide(diffText: string, side: 'existing' | 'modified'): string {
  const lines = diffText.split('\n');
  const result: string[] = [];
  let inHunk = false;

  for (const line of lines) {
    // Keep diff headers and file headers as-is
    if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      result.push(line);
      inHunk = false;
      continue;
    }
    if (line.startsWith('@@')) {
      result.push(line);
      inHunk = true;
      continue;
    }

    if (!inHunk) {
      result.push(line);
      continue;
    }

    // Inside a hunk: filter lines based on side
    if (side === 'existing') {
      // Show context lines and removed lines (old file content)
      if (line.startsWith('+')) continue; // skip additions
      result.push(line.startsWith('-') ? ' ' + line.slice(1) : line);
    } else {
      // Show context lines and added lines (new file content)
      if (line.startsWith('-')) continue; // skip removals
      result.push(line.startsWith('+') ? ' ' + line.slice(1) : line);
    }
  }

  return result.join('\n');
}
