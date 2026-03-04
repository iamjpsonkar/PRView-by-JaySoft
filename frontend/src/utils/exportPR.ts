interface ExportPR {
  id: number;
  title: string;
  status: string;
  source_branch: string;
  target_branch: string;
  author: string;
  description: string;
  created_at: string;
  updated_at: string;
  labels?: { name: string; color: string }[];
}

interface ExportReview {
  reviewer: string;
  vote: string;
  body: string;
  created_at: string;
}

interface ExportComment {
  author: string;
  body: string;
  file_path: string | null;
  line_number: number | null;
  status: string;
  created_at: string;
  replies: ExportComment[];
}

interface ExportStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}

export function exportPRAsMarkdown(
  pr: ExportPR,
  reviews: ExportReview[],
  comments: ExportComment[],
  stats: ExportStats | null,
): void {
  const lines: string[] = [];

  lines.push(`# PR #${pr.id}: ${pr.title}`);
  lines.push('');
  lines.push(`**Status:** ${pr.status}`);
  lines.push(`**Author:** ${pr.author}`);
  lines.push(`**Branches:** \`${pr.source_branch}\` → \`${pr.target_branch}\``);
  lines.push(`**Created:** ${new Date(pr.created_at).toLocaleString()}`);
  lines.push(`**Updated:** ${new Date(pr.updated_at).toLocaleString()}`);

  if (pr.labels && pr.labels.length > 0) {
    lines.push(`**Labels:** ${pr.labels.map((l) => l.name).join(', ')}`);
  }

  if (stats) {
    lines.push('');
    lines.push('## Statistics');
    lines.push(`- **Files changed:** ${stats.files_changed}`);
    lines.push(`- **Insertions:** +${stats.insertions}`);
    lines.push(`- **Deletions:** -${stats.deletions}`);
  }

  if (pr.description) {
    lines.push('');
    lines.push('## Description');
    lines.push(pr.description);
  }

  if (reviews.length > 0) {
    lines.push('');
    lines.push('## Reviews');
    for (const r of reviews) {
      lines.push(`### ${r.reviewer} — ${r.vote}`);
      lines.push(`*${new Date(r.created_at).toLocaleString()}*`);
      if (r.body) lines.push('', r.body);
      lines.push('');
    }
  }

  const generalComments = comments.filter((c) => !c.file_path);
  const fileComments = comments.filter((c) => c.file_path);

  if (generalComments.length > 0) {
    lines.push('## General Comments');
    for (const c of generalComments) {
      renderComment(lines, c, 0);
    }
  }

  if (fileComments.length > 0) {
    lines.push('');
    lines.push('## Inline Comments');
    for (const c of fileComments) {
      lines.push(`### \`${c.file_path}${c.line_number ? ':' + c.line_number : ''}\``);
      renderComment(lines, c, 0);
    }
  }

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PR-${pr.id}-${pr.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderComment(lines: string[], comment: ExportComment, depth: number) {
  const indent = '> '.repeat(depth);
  lines.push(`${indent}**${comment.author}** ${comment.status === 'resolved' ? '(resolved)' : ''} — *${new Date(comment.created_at).toLocaleString()}*`);
  lines.push(`${indent}${comment.body}`);
  lines.push('');
  for (const reply of comment.replies) {
    renderComment(lines, reply, depth + 1);
  }
}
