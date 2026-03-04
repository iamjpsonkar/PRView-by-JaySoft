import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSettingsStore } from '../stores/settings.store';
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui';
import 'diff2html/bundles/css/diff2html.min.css';
import { Header } from '../components/layout/Header';
import { filterDiffSide } from '../utils/diffFilter';
import { FileTree } from '../components/pr/FileTree';
import type { DiffFile, DiffStats, Commit, BranchInfo } from '../types';

function BranchSelector({ value, onChange, repoId, placeholder }: {
  value: string; onChange: (v: string) => void; repoId: string; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<BranchInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch branches from server with search filter
  const fetchBranches = (query: string) => {
    setSearching(true);
    const params = new URLSearchParams({ limit: '50' });
    if (query) params.set('search', query);
    api.get<BranchInfo[]>(`/repos/${repoId}/branches?${params}`).then((b) => {
      setResults(b);
      setSearching(false);
    }).catch(() => setSearching(false));
  };

  // Load initial results when dropdown opens
  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
    if (results.length === 0) fetchBranches(search);
  };

  // Debounced search
  const handleSearch = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchBranches(q), 300);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 240 }}>
      <div
        onClick={handleOpen}
        style={{
          padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 14,
          cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: value ? '#1a1a1a' : '#9aa0a6',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9aa0a6" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'white', border: '1px solid #dadce0', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 320, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type to search branches..."
              style={{
                width: '100%', padding: '6px 10px', border: '1px solid #dadce0', borderRadius: 4,
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div style={{ overflow: 'auto', maxHeight: 260 }}>
            {searching ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#9aa0a6', fontSize: 13 }}>Searching...</div>
            ) : results.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#9aa0a6', fontSize: 13 }}>
                {search ? 'No branches found' : 'Type to search branches'}
              </div>
            ) : results.map((b) => (
              <div
                key={b.name}
                onClick={() => { onChange(b.name); setOpen(false); setSearch(''); }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  background: value === b.name ? '#e8f4fd' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
                onMouseEnter={(e) => { if (value !== b.name) e.currentTarget.style.background = '#f9f9f9'; }}
                onMouseLeave={(e) => { if (value !== b.name) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                {b.is_current && <span style={{ fontSize: 10, color: '#0078d4', fontWeight: 600 }}>HEAD</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ComparePage() {
  const { repoId, branches: urlBranches } = useParams<{ repoId: string; branches: string }>();
  const navigate = useNavigate();
  const { diffViewMode, setDiffViewMode } = useSettingsStore();

  // Parse branches from URL (source...target)
  const parts = (urlBranches || '').split('...');
  const [source, setSource] = useState(parts[0] || '');
  const [target, setTarget] = useState(parts[1] || '');

  const [files, setFiles] = useState<DiffFile[]>([]);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [fullDiff, setFullDiff] = useState<string | null>(null);
  const diffRef = useRef<HTMLDivElement>(null);

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const resizingRef = useRef(false);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      setSidebarWidth(Math.max(160, Math.min(600, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    if (source && target && source !== target) {
      loadComparison();
    }
  }, [source, target]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const [f, s, c] = await Promise.all([
        api.get<DiffFile[]>(`/repos/${repoId}/compare/${encodeURIComponent(source)}...${encodeURIComponent(target)}/files`),
        api.get<DiffStats>(`/repos/${repoId}/compare/${encodeURIComponent(source)}...${encodeURIComponent(target)}/stats`),
        api.get<Commit[]>(`/repos/${repoId}/compare/${encodeURIComponent(source)}...${encodeURIComponent(target)}/commits`),
      ]);
      setFiles(f);
      setStats(s);
      setCommits(c);
      // Load full diff
      const d = await api.get<{ diff_text: string }>(`/repos/${repoId}/compare/${encodeURIComponent(source)}...${encodeURIComponent(target)}/diff`);
      setFullDiff(d.diff_text);
    } catch { }
    setLoading(false);
  };

  const loadFileDiff = async (path: string) => {
    if (fileDiffs[path]) { setSelectedFile(path); return; }
    try {
      const res = await api.get<{ path: string; diff_text: string }>(
        `/repos/${repoId}/compare/${encodeURIComponent(source)}...${encodeURIComponent(target)}/diff/file?path=${encodeURIComponent(path)}`
      );
      setFileDiffs((prev) => ({ ...prev, [path]: res.diff_text }));
      setSelectedFile(path);
    } catch { }
  };

  // Render diff
  useEffect(() => {
    if (!diffRef.current) return;
    const diffText = selectedFile ? fileDiffs[selectedFile] : fullDiff;
    if (!diffText) { diffRef.current.innerHTML = ''; return; }
    diffRef.current.innerHTML = '';
    const renderText = (diffViewMode === 'existing' || diffViewMode === 'modified')
      ? filterDiffSide(diffText, diffViewMode)
      : diffText;
    try {
      new Diff2HtmlUI(diffRef.current, renderText, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: diffViewMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
        renderNothingWhenEmpty: false,
      }).draw();
    } catch {
      diffRef.current.innerHTML = `<pre style="padding:16px;font-size:12px;overflow:auto">${renderText.replace(/</g, '&lt;')}</pre>`;
    }
  }, [selectedFile, fileDiffs, fullDiff, diffViewMode]);

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      <Header breadcrumbs={[
        { label: 'Pull Requests', to: `/repos/${repoId}/prs` },
        { label: 'Compare Branches' },
      ]} />

      {/* Branch selectors */}
      <div style={{ background: 'white', borderBottom: '1px solid #dadce0', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BranchSelector
            value={source}
            onChange={(v) => { setSource(v); setSelectedFile(null); setFileDiffs({}); setFullDiff(null); }}
            repoId={repoId!}
            placeholder="Select source branch..."
          />
          <span style={{ fontSize: 16, color: '#5f6368' }}>...</span>
          <BranchSelector
            value={target}
            onChange={(v) => { setTarget(v); setSelectedFile(null); setFileDiffs({}); setFullDiff(null); }}
            repoId={repoId!}
            placeholder="Select target branch..."
          />
          {source && target && source !== target && (
            <button
              onClick={() => navigate(`/repos/${repoId}/prs`, {
                state: { prefillSource: source, prefillTarget: target },
              })}
              style={{
                marginLeft: 'auto', padding: '8px 16px', background: '#107c10', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}
            >
              Create PR from this comparison
            </button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div style={{ maxWidth: 1200, margin: '16px auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span>{stats.files_changed} files changed</span>
            <span style={{ color: '#107c10' }}>+{stats.insertions} insertions</span>
            <span style={{ color: '#d13438' }}>-{stats.deletions} deletions</span>
            <span>{commits.length} commits</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Loading comparison...</div>
      ) : source && target && source !== target && files.length > 0 ? (
        <div style={{ maxWidth: '100%', margin: '8px auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `${sidebarWidth}px 8px minmax(0, 1fr)`, gap: 0 }}>
            {/* File tree */}
            <div style={{
              background: 'white', borderRadius: 8, border: '1px solid #dadce0',
              maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'hidden', position: 'sticky', top: 16,
            }}>
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onSelectFile={(path) => path ? loadFileDiff(path) : setSelectedFile(null)}
                fileCount={files.length}
              />
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                cursor: 'col-resize', width: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <div style={{ width: 3, height: 40, borderRadius: 2, background: '#dadce0', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0078d4'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#dadce0'; }}
              />
            </div>

            {/* Diff viewer */}
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                background: 'white', borderRadius: '8px 8px 0 0', border: '1px solid #dadce0',
                borderBottom: 'none', padding: '8px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {selectedFile || 'All changes'}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['inline', 'side-by-side', 'existing', 'modified'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDiffViewMode(mode)}
                      style={{
                        padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                        background: diffViewMode === mode ? '#0078d4' : 'white',
                        color: diffViewMode === mode ? 'white' : '#1a1a1a', cursor: 'pointer',
                      }}
                    >
                      {mode === 'inline' ? 'Inline' : mode === 'side-by-side' ? 'Side by Side' : mode === 'existing' ? 'Existing' : 'Modified'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{
                background: 'white', borderRadius: '0 0 8px 8px', border: '1px solid #dadce0',
                overflow: 'hidden', maxHeight: 'calc(100vh - 300px)',
              }}>
                <div ref={diffRef} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }} />
              </div>
            </div>
          </div>
        </div>
      ) : source && target && source === target ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Source and target branches must be different</div>
      ) : !source || !target ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Select two branches to compare</div>
      ) : (
        <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>No differences found between branches</div>
      )}
    </div>
  );
}
