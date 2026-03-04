/**
 * Filters a unified diff for single-side viewing.
 *
 * - "existing": Target branch code — plain text, no diff coloring.
 *   Strips additions, converts removals to context lines.
 *
 * - "modified": Source branch code — keeps diff markers (+/-) so
 *   diff2html renders red/green backgrounds on changed lines.
 */
export function filterDiffSide(diffText: string, side: 'existing' | 'modified'): string {
  const lines = diffText.split('\n');
  const result: string[] = [];
  let inHunk = false;

  for (const line of lines) {
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

    if (side === 'existing') {
      // Target branch: skip additions, show removals as plain context
      if (line.startsWith('+')) continue;
      result.push(line.startsWith('-') ? ' ' + line.slice(1) : line);
    } else {
      // Source branch: keep all lines with their +/- markers for red/green coloring
      result.push(line);
    }
  }

  return result.join('\n');
}
