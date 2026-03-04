import { useMemo, useState } from 'react';
import type { DiffFile } from '../../types';

// ─── Types ───

interface TreeNode {
  name: string;
  fullPath: string;
  type: 'folder' | 'file';
  children: TreeNode[];
  file?: DiffFile;
  insertions: number;
  deletions: number;
}

export interface FileTreeProps {
  files: DiffFile[];
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
  fileCount: number;
  stats?: { insertions: number; deletions: number } | null;
  headerExtra?: React.ReactNode;
  reviewedFiles?: {
    isReviewed: (path: string) => boolean;
    onToggleReviewed: (path: string) => void;
  };
}

// ─── Tree builder ───

function buildTree(files: DiffFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const segments = file.path.split('/');
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isFile = i === segments.length - 1;
      const fullPath = segments.slice(0, i + 1).join('/');

      let existing = current.find((n) => n.name === seg && n.type === (isFile ? 'file' : 'folder'));
      if (!existing) {
        existing = {
          name: seg,
          fullPath,
          type: isFile ? 'file' : 'folder',
          children: [],
          file: isFile ? file : undefined,
          insertions: 0,
          deletions: 0,
        };
        current.push(existing);
      }
      if (isFile) {
        existing.insertions = file.insertions;
        existing.deletions = file.deletions;
      }
      current = existing.children;
    }
  }

  // Sort and aggregate
  function sortAndAggregate(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.type === 'folder') {
        sortAndAggregate(node.children);
        node.insertions = node.children.reduce((s, c) => s + c.insertions, 0);
        node.deletions = node.children.reduce((s, c) => s + c.deletions, 0);
      }
    }
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  sortAndAggregate(root);
  return root;
}

// ─── Status badge constants ───

const statusIcon: Record<string, string> = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R' };
const statusColors: Record<string, string> = { added: '#107c10', modified: '#ca5010', deleted: '#d13438', renamed: '#0078d4' };

// ─── Component ───

export function FileTree({ files, selectedFile, onSelectFile, fileCount, stats, headerExtra, reviewedFiles }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  function renderNodes(nodes: TreeNode[], depth: number) {
    return nodes.map((node) => {
      const isCollapsed = collapsed.has(node.fullPath);
      const pad = 12 + depth * 16;

      if (node.type === 'folder') {
        return (
          <div key={node.fullPath + '/'}>
            <div
              onClick={() => toggle(node.fullPath)}
              style={{
                padding: '4px 12px 4px 0', paddingLeft: pad, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 4,
                borderBottom: '1px solid #f0f0f0',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9f9f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 10, color: '#5f6368', flexShrink: 0 }}>
                {isCollapsed ? '\u25B8' : '\u25BE'}
              </span>
              <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.name}/
              </span>
              <span style={{ fontSize: 11, flexShrink: 0, color: '#5f6368' }}>
                <span style={{ color: '#107c10' }}>+{node.insertions}</span>
                {' '}
                <span style={{ color: '#d13438' }}>-{node.deletions}</span>
              </span>
            </div>
            {!isCollapsed && renderNodes(node.children, depth + 1)}
          </div>
        );
      }

      // File node
      const file = node.file!;
      const isSelected = selectedFile === file.path;
      const reviewed = reviewedFiles?.isReviewed(file.path);

      return (
        <div
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          style={{
            padding: '6px 12px 6px 0', paddingLeft: pad, cursor: 'pointer', fontSize: 13,
            background: isSelected ? '#e8f4fd' : 'transparent',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: reviewed ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9f9f9'; }}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
        >
          {reviewedFiles && (
            <input
              type="checkbox"
              checked={!!reviewed}
              onChange={(e) => { e.stopPropagation(); reviewedFiles.onToggleReviewed(file.path); }}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'pointer', accentColor: '#107c10', flexShrink: 0 }}
              title={reviewed ? 'Mark as unreviewed' : 'Mark as reviewed'}
            />
          )}
          <span style={{
            width: 18, height: 18, borderRadius: 3, fontSize: 11,
            background: (statusColors[file.status] || '#5f6368') + '20',
            color: statusColors[file.status] || '#5f6368',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, flexShrink: 0,
          }}>
            {statusIcon[file.status] || 'M'}
          </span>
          <span title={file.path} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
          <span style={{ fontSize: 11, flexShrink: 0 }}>
            <span style={{ color: '#107c10' }}>+{file.insertions}</span>
            {' '}
            <span style={{ color: '#d13438' }}>-{file.deletions}</span>
          </span>
        </div>
      );
    });
  }

  return (
    <>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #dadce0', fontSize: 13, fontWeight: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Changed Files ({fileCount})</span>
          {stats && (
            <span style={{ fontWeight: 400, fontSize: 12 }}>
              <span style={{ color: '#107c10' }}>+{stats.insertions}</span>
              {' '}
              <span style={{ color: '#d13438' }}>-{stats.deletions}</span>
            </span>
          )}
        </div>
        {headerExtra}
      </div>

      {/* All files button */}
      <div
        onClick={() => onSelectFile(null)}
        style={{
          padding: '8px 16px', cursor: 'pointer', fontSize: 13,
          background: !selectedFile ? '#e8f4fd' : 'transparent',
          borderBottom: '1px solid #f0f0f0', fontWeight: 600,
        }}
      >
        All files
      </div>

      {/* Tree */}
      {renderNodes(tree, 0)}
    </>
  );
}
