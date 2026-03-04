import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { usePRStore } from '../stores/pr.store';
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui';
import 'diff2html/bundles/css/diff2html.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useThemeStore } from '../stores/theme.store';

// ─── Types ───
interface PR {
  id: number; repo_id: string; title: string; description: string;
  source_branch: string; target_branch: string; status: string;
  author: string; created_at: string; updated_at: string;
  completed_at: string | null; comment_count: number;
  review_summary: Record<string, string>;
}
interface DiffFile {
  path: string; status: string; insertions: number; deletions: number; old_path?: string;
}
interface DiffStats { files_changed: number; insertions: number; deletions: number; }
interface Commit {
  sha: string; short_sha: string; message: string;
  author_name: string; author_email: string; authored_date: string; files_changed: number;
}
interface Comment {
  id: number; pr_id: number; parent_id: number | null;
  file_path: string | null; line_number: number | null;
  line_type: string | null; body: string; author: string;
  status: string; created_at: string; updated_at: string;
  replies: Comment[];
}
interface Review {
  id: number; pr_id: number; reviewer: string;
  vote: string; body: string; created_at: string;
}
interface ConflictFile {
  path: string;
  conflict_content: string;
  ours: string;
  theirs: string;
  base: string;
}

// ─── Vote Icons ───
const voteDisplay: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#107c10' },
  approved_with_suggestions: { label: 'Approved with suggestions', color: '#ca5010' },
  wait_for_author: { label: 'Waiting for author', color: '#ca5010' },
  rejected: { label: 'Rejected', color: '#d13438' },
};

const VALID_TABS = ['overview', 'files', 'commits', 'conflicts'] as const;
type Tab = typeof VALID_TABS[number];

export function PRDetailPage() {
  const { repoId, prId, tab: urlTab } = useParams<{ repoId: string; prId: string; tab?: string }>();
  const navigate = useNavigate();
  const { diffViewMode, setDiffViewMode } = usePRStore();
  const { dark, toggle: toggleTheme } = useThemeStore();

  const activeTab: Tab = VALID_TABS.includes(urlTab as Tab) ? (urlTab as Tab) : 'overview';
  const setActiveTab = (tab: Tab) => navigate(`/repos/${repoId}/prs/${prId}/${tab}`, { replace: true });

  const [pr, setPr] = useState<PR | null>(null);
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Comment state
  const [commentBody, setCommentBody] = useState('');
  const [commentFile, setCommentFile] = useState<string | null>(null);
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [showGeneralComment, setShowGeneralComment] = useState(false);

  // Edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [reviewVote, setReviewVote] = useState('approved');
  const [reviewBody, setReviewBody] = useState('');

  // Merge state
  const [showMerge, setShowMerge] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState('merge');
  const [mergeMsg, setMergeMsg] = useState('');
  const [deleteSource, setDeleteSource] = useState(false);
  const [mergeCheck, setMergeCheck] = useState<{ can_merge: boolean; has_conflicts: boolean; conflicting_files: string[] } | null>(null);

  // Commit diff state
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitDiff, setCommitDiff] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<DiffFile[]>([]);
  const [selectedCommitFile, setSelectedCommitFile] = useState<string | null>(null);
  const [commitFileDiffs, setCommitFileDiffs] = useState<Record<string, string>>({});
  const commitDiffRef = useRef<HTMLDivElement>(null);

  const diffRef = useRef<HTMLDivElement>(null);

  // Conflict state
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, string>>({});
  const [activeConflictFile, setActiveConflictFile] = useState<string | null>(null);
  const [conflictResolving, setConflictResolving] = useState(false);

  // ─── Load data ───
  useEffect(() => {
    if (!repoId || !prId) return;
    loadPR();
    loadComments();
    loadReviews();
  }, [repoId, prId]);

  useEffect(() => {
    if (activeTab === 'files') { loadFiles(); loadStats(); loadComments(); }
    if (activeTab === 'commits') loadCommits();
    if (activeTab === 'conflicts') loadConflicts();
  }, [activeTab]);

  const loadPR = async () => {
    setLoading(true);
    try { setPr(await api.get(`/repos/${repoId}/prs/${prId}`)); }
    catch { }
    setLoading(false);
  };

  const loadFiles = async () => {
    try { setFiles(await api.get(`/repos/${repoId}/prs/${prId}/diff/files`)); }
    catch { }
  };

  const loadStats = async () => {
    try { setStats(await api.get(`/repos/${repoId}/prs/${prId}/diff/stats`)); }
    catch { }
  };

  const loadCommits = async () => {
    try { setCommits(await api.get(`/repos/${repoId}/prs/${prId}/commits`)); }
    catch { }
  };

  const loadComments = async () => {
    try { setComments(await api.get(`/repos/${repoId}/prs/${prId}/comments`)); }
    catch { }
  };

  const loadConflicts = async () => {
    setConflictLoading(true);
    try {
      const res = await api.get<{ has_conflicts: boolean; files: ConflictFile[] }>(`/repos/${repoId}/prs/${prId}/merge/conflicts`);
      setConflictFiles(res.files);
      // Pre-populate resolutions with conflict content
      const resMap: Record<string, string> = {};
      res.files.forEach((f) => { resMap[f.path] = f.conflict_content; });
      setConflictResolutions(resMap);
      if (res.files.length > 0 && !activeConflictFile) setActiveConflictFile(res.files[0].path);
    } catch { setConflictFiles([]); }
    setConflictLoading(false);
  };

  const resolveConflicts = async () => {
    setConflictResolving(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/repos/${repoId}/prs/${prId}/merge/resolve`, {
        resolutions: conflictResolutions,
      });
      if (res.success) {
        loadPR();
        setActiveTab('overview');
      } else {
        alert(res.message);
      }
    } catch (e: any) { alert(e.message); }
    setConflictResolving(false);
  };

  const loadReviews = async () => {
    try { setReviews(await api.get(`/repos/${repoId}/prs/${prId}/reviews`)); }
    catch { }
  };

  // ─── Load file diff ───
  const loadFileDiff = async (path: string) => {
    if (fileDiffs[path]) { setSelectedFile(path); return; }
    try {
      const res = await api.get<{ path: string; diff_text: string }>(`/repos/${repoId}/prs/${prId}/diff/file?path=${encodeURIComponent(path)}`);
      setFileDiffs((prev) => ({ ...prev, [path]: res.diff_text }));
      setSelectedFile(path);
    } catch { }
  };

  // ─── Load full diff ───
  const [fullDiff, setFullDiff] = useState<string | null>(null);
  const loadFullDiff = async () => {
    try {
      const res = await api.get<{ diff_text: string }>(`/repos/${repoId}/prs/${prId}/diff/full`);
      setFullDiff(res.diff_text);
    } catch { }
  };

  useEffect(() => {
    if (activeTab === 'files' && !selectedFile) loadFullDiff();
  }, [activeTab]);

  // ─── Commit diff ───
  const loadCommitDiff = async (sha: string) => {
    if (selectedCommit === sha) { setSelectedCommit(null); setCommitDiff(null); setCommitFiles([]); setSelectedCommitFile(null); return; }
    setSelectedCommit(sha);
    setSelectedCommitFile(null);
    setCommitFileDiffs({});
    try {
      const [diffRes, filesRes] = await Promise.all([
        api.get<{ diff_text: string }>(`/repos/${repoId}/prs/${prId}/commits/${sha}/diff`),
        api.get<DiffFile[]>(`/repos/${repoId}/prs/${prId}/commits/${sha}/files`),
      ]);
      setCommitDiff(diffRes.diff_text);
      setCommitFiles(filesRes);
    } catch { setCommitDiff(null); setCommitFiles([]); }
  };

  const loadCommitFileDiff = async (sha: string, path: string) => {
    if (commitFileDiffs[path]) { setSelectedCommitFile(path); return; }
    try {
      const res = await api.get<{ path: string; diff_text: string }>(`/repos/${repoId}/prs/${prId}/commits/${sha}/diff/file?path=${encodeURIComponent(path)}`);
      setCommitFileDiffs((prev) => ({ ...prev, [path]: res.diff_text }));
      setSelectedCommitFile(path);
    } catch { }
  };

  // Render commit diff
  useEffect(() => {
    if (!commitDiffRef.current || !selectedCommit) return;
    const diffText = selectedCommitFile ? commitFileDiffs[selectedCommitFile] : commitDiff;
    if (!diffText) {
      commitDiffRef.current.innerHTML = '<div style="padding:48px;text-align:center;color:#5f6368">No changes to display</div>';
      return;
    }
    commitDiffRef.current.innerHTML = '';
    const ui = new Diff2HtmlUI(commitDiffRef.current, diffText, {
      outputFormat: diffViewMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      drawFileList: false,
      matching: 'lines',
      highlight: true,
      synchronisedScroll: true,
      stickyFileHeaders: true,
      renderNothingWhenEmpty: false,
    });
    ui.draw();
    ui.highlightCode();
    if (diffViewMode === 'side-by-side') ui.synchronisedScroll();
    ui.stickyFileHeaders();
  }, [commitDiff, commitFileDiffs, selectedCommitFile, diffViewMode]);

  // ─── Inline comment state ───
  const [inlineComment, setInlineComment] = useState<{ file: string; line: number; side: string } | null>(null);
  const [inlineCommentBody, setInlineCommentBody] = useState('');

  const submitInlineComment = async () => {
    if (!inlineCommentBody.trim() || !inlineComment) return;
    try {
      await api.post(`/repos/${repoId}/prs/${prId}/comments`, {
        body: inlineCommentBody,
        file_path: inlineComment.file,
        line_number: inlineComment.line,
        line_type: inlineComment.side,
      });
      setInlineComment(null);
      setInlineCommentBody('');
      loadComments();
      loadPR();
    } catch { }
  };

  // ─── Render diff ───
  useEffect(() => {
    if (!diffRef.current) return;
    const diffText = selectedFile ? fileDiffs[selectedFile] : fullDiff;
    if (!diffText) {
      diffRef.current.innerHTML = '<div style="padding:48px;text-align:center;color:#5f6368">No changes to display</div>';
      return;
    }

    diffRef.current.innerHTML = '';

    const ui = new Diff2HtmlUI(diffRef.current, diffText, {
      outputFormat: diffViewMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
      drawFileList: false,
      matching: 'lines',
      highlight: true,
      synchronisedScroll: true,
      stickyFileHeaders: true,
      fileContentToggle: true,
      renderNothingWhenEmpty: false,
    });
    ui.draw();
    ui.highlightCode();
    if (diffViewMode === 'side-by-side') {
      ui.synchronisedScroll();
    }
    ui.stickyFileHeaders();

    // Inject comment buttons on each code line
    if (diffRef.current) {
      const rows = diffRef.current.querySelectorAll('.d2h-diff-tbody tr');
      rows.forEach((row) => {
        const lineNumEl = row.querySelector('.d2h-code-linenumber, .d2h-code-side-linenumber');
        if (!lineNumEl) return;
        const lineText = lineNumEl.textContent?.trim();
        if (!lineText || lineText === '...') return;

        const nums = lineText.match(/\d+/);
        if (!nums) return;
        const lineNum = parseInt(nums[0], 10);

        const fileWrapper = row.closest('.d2h-file-wrapper');
        const fileNameEl = fileWrapper?.querySelector('.d2h-file-name');
        const filePath = fileNameEl?.textContent?.trim() || selectedFile || '';

        const isRight = row.closest('.d2h-file-side-diff:last-child') !== null;
        const side = isRight ? 'new' : 'old';

        // Create comment button
        const btn = document.createElement('button');
        btn.className = 'prv-comment-btn';
        btn.textContent = '+';
        btn.title = `Comment on line ${lineNum}`;
        btn.onclick = (e) => {
          e.stopPropagation();
          setInlineComment({ file: filePath, line: lineNum, side });
          setInlineCommentBody('');
        };

        const firstTd = row.querySelector('td');
        if (firstTd) {
          firstTd.style.position = 'relative';
          firstTd.appendChild(btn);
        }

        // Show comment count badge if there are comments on this line
        const lineComments = comments.filter(
          (c) => c.file_path === filePath && c.line_number === lineNum && !c.parent_id
        );
        if (lineComments.length > 0) {
          const badge = document.createElement('span');
          badge.className = 'prv-comment-badge';
          badge.textContent = `💬 ${lineComments.length}`;
          badge.title = lineComments.map((c) => `${c.author}: ${c.body.slice(0, 60)}`).join('\n');
          badge.style.cssText = 'position:absolute;right:2px;top:0;font-size:10px;background:#e8f4fd;color:#0078d4;padding:0 4px;border-radius:8px;cursor:pointer;z-index:5;line-height:16px;';
          if (firstTd) firstTd.appendChild(badge);
        }
      });
    }
  }, [selectedFile, fileDiffs, fullDiff, diffViewMode, comments]);

  // ─── Comment actions ───
  const submitComment = async () => {
    if (!commentBody.trim()) return;
    try {
      await api.post(`/repos/${repoId}/prs/${prId}/comments`, {
        body: commentBody,
        file_path: commentFile,
        line_number: commentLine,
        parent_id: replyTo,
      });
      setCommentBody('');
      setCommentFile(null);
      setCommentLine(null);
      setReplyTo(null);
      setShowGeneralComment(false);
      loadComments();
      loadPR();
    } catch { }
  };

  const resolveComment = async (id: number) => {
    await api.post(`/repos/${repoId}/prs/${prId}/comments/${id}/resolve`);
    loadComments();
  };

  const deleteComment = async (id: number) => {
    await api.delete(`/repos/${repoId}/prs/${prId}/comments/${id}`);
    loadComments();
    loadPR();
  };

  // ─── Review actions ───
  const submitReview = async () => {
    try {
      await api.post(`/repos/${repoId}/prs/${prId}/reviews`, { vote: reviewVote, body: reviewBody });
      setShowReview(false);
      setReviewBody('');
      loadReviews();
      loadPR();
    } catch { }
  };

  // ─── Merge actions ───
  const checkMerge = async () => {
    try {
      const res = await api.post<any>(`/repos/${repoId}/prs/${prId}/merge/check`);
      setMergeCheck(res);
      setShowMerge(true);
    } catch { }
  };

  const executeMerge = async () => {
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/repos/${repoId}/prs/${prId}/merge`, {
        strategy: mergeStrategy,
        commit_message: mergeMsg || undefined,
        delete_source_branch: deleteSource,
      });
      if (res.success) {
        setShowMerge(false);
        loadPR();
      } else {
        alert(res.message);
      }
    } catch (e: any) { alert(e.message); }
  };

  // ─── PR status actions ───
  const updatePRStatus = async (status: string) => {
    await api.patch(`/repos/${repoId}/prs/${prId}`, { status });
    loadPR();
  };

  const saveTitle = async () => {
    if (!editTitle.trim()) return;
    await api.patch(`/repos/${repoId}/prs/${prId}`, { title: editTitle });
    setEditingTitle(false);
    loadPR();
  };

  const saveDescription = async () => {
    await api.patch(`/repos/${repoId}/prs/${prId}`, { description: editDesc });
    setEditingDesc(false);
    loadPR();
  };

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') setActiveTab('overview');
      if (e.key === '2') setActiveTab('files');
      if (e.key === '3') setActiveTab('commits');
      if (e.key === '4') setActiveTab('conflicts');
      // Navigate files with j/k
      if (activeTab === 'files' && files.length > 0) {
        const idx = selectedFile ? files.findIndex((f) => f.path === selectedFile) : -1;
        if (e.key === 'j' && idx < files.length - 1) {
          const next = files[idx + 1];
          if (next) loadFileDiff(next.path);
        }
        if (e.key === 'k' && idx > 0) {
          const prev = files[idx - 1];
          if (prev) loadFileDiff(prev.path);
        }
        if (e.key === 'a') setSelectedFile(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, files, selectedFile]);

  const generalComments = comments.filter((c) => !c.file_path && !c.parent_id);
  const fileComments = comments.filter((c) => c.file_path && !c.parent_id);

  if (loading || !pr) {
    return <div style={{ padding: 48, textAlign: 'center' }}>Loading...</div>;
  }

  const statusColor: Record<string, string> = {
    active: '#0078d4', draft: '#ca5010', completed: '#107c10', abandoned: '#8a8886',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Header */}
      <header style={{
        background: '#0078d4', color: 'white', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3v12l6-3 6 3V3" />
          </svg>
          PRView
        </Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <Link to={`/repos/${repoId}/prs`} style={{ color: 'white', textDecoration: 'none' }}>Pull Requests</Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <span>#{pr.id}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={toggleTheme} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
            color: 'white', cursor: 'pointer', padding: '4px 10px', fontSize: 14,
          }} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? '\u2600' : '\u263D'}
          </button>
        </div>
      </header>

      {/* PR Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #dadce0', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
              background: (statusColor[pr.status] || '#8a8886') + '18',
              color: statusColor[pr.status] || '#8a8886', textTransform: 'uppercase',
            }}>{pr.status}</span>
            {editingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  style={{ fontSize: 20, fontWeight: 600, border: '1px solid #0078d4', borderRadius: 4, padding: '2px 8px', flex: 1 }}
                />
                <button onClick={saveTitle} style={{ padding: '4px 12px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingTitle(false)} style={{ padding: '4px 12px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <h1
                style={{ fontSize: 22, fontWeight: 600, cursor: pr.status !== 'completed' ? 'pointer' : 'default' }}
                onClick={() => { if (pr.status !== 'completed') { setEditTitle(pr.title); setEditingTitle(true); } }}
                title={pr.status !== 'completed' ? 'Click to edit title' : undefined}
              >{pr.title}</h1>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#5f6368', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>
              <span style={{
                background: '#e8eaed', padding: '2px 8px', borderRadius: 4,
                fontFamily: 'monospace', fontSize: 12,
              }}>{pr.source_branch}</span>
              {' → '}
              <span style={{
                background: '#e8eaed', padding: '2px 8px', borderRadius: 4,
                fontFamily: 'monospace', fontSize: 12,
              }}>{pr.target_branch}</span>
            </span>
            <span>by {pr.author}</span>
            <span>Created {new Date(pr.created_at).toLocaleDateString()}</span>
          </div>
          {/* Review badges */}
          {Object.keys(pr.review_summary).length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {Object.entries(pr.review_summary).map(([reviewer, vote]) => (
                <span key={reviewer} style={{
                  fontSize: 12, padding: '2px 8px', borderRadius: 10,
                  background: (voteDisplay[vote]?.color || '#5f6368') + '18',
                  color: voteDisplay[vote]?.color || '#5f6368',
                }}>
                  {reviewer}: {voteDisplay[vote]?.label || vote}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #dadce0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0 }}>
          {VALID_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px', background: 'transparent', border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0078d4' : '2px solid transparent',
                color: activeTab === tab ? '#0078d4' : '#5f6368',
                fontWeight: activeTab === tab ? 600 : 400, cursor: 'pointer',
                fontSize: 14, textTransform: 'capitalize',
              }}
            >
              {tab}
              {tab === 'files' && stats && (
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({stats.files_changed})</span>
              )}
              {tab === 'commits' && commits.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({commits.length})</span>
              )}
              {tab === 'conflicts' && conflictFiles.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: '#d13438', color: 'white', fontWeight: 700,
                }}>{conflictFiles.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: (activeTab === 'files' || activeTab === 'conflicts' || (activeTab === 'commits' && selectedCommit)) ? '100%' : 1200, margin: '16px auto', padding: '0 24px' }}>
        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
            <div>
              {/* Description */}
              <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 16, border: '1px solid #dadce0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600 }}>Description</h3>
                  {!editingDesc && pr.status !== 'completed' && (
                    <button
                      onClick={() => { setEditDesc(pr.description); setEditingDesc(true); }}
                      style={{ padding: '3px 10px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                    >Edit</button>
                  )}
                </div>
                {editingDesc ? (
                  <div>
                    <textarea
                      autoFocus
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Describe your changes (Markdown supported)"
                      rows={8}
                      style={{ width: '100%', padding: 8, border: '1px solid #dadce0', borderRadius: 4, fontSize: 13, resize: 'vertical', fontFamily: 'monospace' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingDesc(false)} style={{ padding: '4px 12px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                      <button onClick={saveDescription} style={{ padding: '4px 12px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
                    </div>
                  </div>
                ) : pr.description ? (
                  <div className="prv-markdown" style={{ fontSize: 14 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{pr.description}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: '#5f6368', fontStyle: 'italic' }}>
                    No description provided. <span style={{ color: '#0078d4', cursor: 'pointer' }} onClick={() => { setEditDesc(''); setEditingDesc(true); }}>Add one</span>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 16, border: '1px solid #dadce0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Activity</h3>
                <div style={{ borderLeft: '2px solid #e8eaed', marginLeft: 8, paddingLeft: 16 }}>
                  {/* Build timeline from reviews, comments, and PR events */}
                  {[
                    { type: 'created', date: pr.created_at, text: `${pr.author} created this pull request`, icon: '+', color: '#0078d4' },
                    ...reviews.map((r) => ({
                      type: 'review', date: r.created_at,
                      text: `${r.reviewer} ${voteDisplay[r.vote]?.label?.toLowerCase() || r.vote}${r.body ? `: ${r.body}` : ''}`,
                      icon: r.vote === 'approved' ? '\u2713' : r.vote === 'rejected' ? '\u2717' : '\u25CF',
                      color: voteDisplay[r.vote]?.color || '#5f6368',
                    })),
                    ...comments.filter((c) => !c.parent_id).map((c) => ({
                      type: 'comment', date: c.created_at,
                      text: `${c.author} commented${c.file_path ? ` on ${c.file_path}${c.line_number ? ':' + c.line_number : ''}` : ''}`,
                      icon: '\u{1F4AC}',
                      color: '#5f6368',
                    })),
                    ...(pr.completed_at ? [{
                      type: 'completed', date: pr.completed_at,
                      text: `Pull request ${pr.status === 'completed' ? 'completed' : pr.status}`,
                      icon: '\u2713', color: '#107c10',
                    }] : []),
                  ]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, i) => (
                      <div key={i} style={{ marginBottom: 12, position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: -24, top: 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: event.color + '20', color: event.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                        }}>{event.icon}</span>
                        <div style={{ fontSize: 13 }}>
                          <span>{event.text}</span>
                          <span style={{ color: '#9aa0a6', marginLeft: 8, fontSize: 12 }}>
                            {new Date(event.date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* General comments */}
              <div style={{ background: 'white', borderRadius: 8, padding: 20, border: '1px solid #dadce0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600 }}>Comments ({generalComments.length})</h3>
                  <button
                    onClick={() => setShowGeneralComment(true)}
                    style={{
                      padding: '4px 12px', background: '#f4f5f7', border: '1px solid #dadce0',
                      borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    Add Comment
                  </button>
                </div>

                {generalComments.map((c) => (
                  <CommentBlock key={c.id} comment={c}
                    onResolve={resolveComment} onDelete={deleteComment}
                    onReply={(id) => { setReplyTo(id); setShowGeneralComment(true); }}
                  />
                ))}

                {showGeneralComment && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
                    {replyTo && <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 4 }}>Replying to comment #{replyTo}</div>}
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      style={{ width: '100%', padding: 8, border: '1px solid #dadce0', borderRadius: 4, fontSize: 13, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setShowGeneralComment(false); setReplyTo(null); setCommentBody(''); }}
                        style={{ padding: '4px 12px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        Cancel
                      </button>
                      <button onClick={submitComment}
                        style={{ padding: '4px 12px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Actions */}
              {pr.status === 'active' && (
                <div style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #dadce0' }}>
                  <button onClick={() => setShowReview(true)} style={{ width: '100%', padding: '8px 16px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
                    Submit Review
                  </button>
                  <button onClick={checkMerge} style={{ width: '100%', padding: '8px 16px', background: '#107c10', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
                    Complete Merge
                  </button>
                  <button onClick={() => updatePRStatus('abandoned')} style={{ width: '100%', padding: '8px 16px', background: 'white', color: '#d13438', border: '1px solid #d13438', borderRadius: 6, cursor: 'pointer' }}>
                    Abandon
                  </button>
                </div>
              )}
              {pr.status === 'draft' && (
                <div style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #dadce0' }}>
                  <button onClick={() => updatePRStatus('active')} style={{ width: '100%', padding: '8px 16px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                    Mark as Ready
                  </button>
                </div>
              )}
              {pr.status === 'abandoned' && (
                <div style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #dadce0' }}>
                  <button onClick={() => updatePRStatus('active')} style={{ width: '100%', padding: '8px 16px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                    Reactivate
                  </button>
                </div>
              )}

              {/* Reviews */}
              <div style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #dadce0' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Reviews</h4>
                {reviews.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#5f6368' }}>No reviews yet</div>
                ) : reviews.map((r) => (
                  <div key={r.id} style={{ marginBottom: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: voteDisplay[r.vote]?.color || '#5f6368', display: 'inline-block',
                      }} />
                      <strong>{r.reviewer}</strong>
                      <span style={{ color: voteDisplay[r.vote]?.color }}>{voteDisplay[r.vote]?.label}</span>
                    </div>
                    {r.body && <div style={{ marginLeft: 14, color: '#5f6368', fontSize: 12 }}>{r.body}</div>}
                  </div>
                ))}
              </div>

              {/* Stats */}
              {stats && (
                <div style={{ background: 'white', borderRadius: 8, padding: 16, border: '1px solid #dadce0' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Statistics</h4>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>{stats.files_changed} files changed</span>
                    <span style={{ color: '#107c10' }}>+{stats.insertions} insertions</span>
                    <span style={{ color: '#d13438' }}>-{stats.deletions} deletions</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ FILES TAB ═══ */}
        {activeTab === 'files' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }}>
            {/* File tree */}
            <div style={{
              background: 'white', borderRadius: 8, border: '1px solid #dadce0',
              maxHeight: 'calc(100vh - 220px)', overflow: 'auto', position: 'sticky', top: 16,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #dadce0', fontSize: 13, fontWeight: 600 }}>
                Changed Files ({files.length})
                {stats && (
                  <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                    <span style={{ color: '#107c10' }}>+{stats.insertions}</span>
                    {' '}
                    <span style={{ color: '#d13438' }}>-{stats.deletions}</span>
                  </span>
                )}
              </div>
              <div
                onClick={() => { setSelectedFile(null); }}
                style={{
                  padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                  background: !selectedFile ? '#e8f4fd' : 'transparent',
                  borderBottom: '1px solid #f0f0f0', fontWeight: 600,
                }}
              >
                All files
              </div>
              {files.map((f) => {
                const statusIcon: Record<string, string> = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R' };
                const statusColors: Record<string, string> = { added: '#107c10', modified: '#ca5010', deleted: '#d13438', renamed: '#0078d4' };
                return (
                  <div
                    key={f.path}
                    onClick={() => loadFileDiff(f.path)}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                      background: selectedFile === f.path ? '#e8f4fd' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    onMouseEnter={(e) => { if (selectedFile !== f.path) e.currentTarget.style.background = '#f9f9f9'; }}
                    onMouseLeave={(e) => { if (selectedFile !== f.path) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 3, fontSize: 11,
                      background: (statusColors[f.status] || '#5f6368') + '20',
                      color: statusColors[f.status] || '#5f6368',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, flexShrink: 0,
                    }}>
                      {statusIcon[f.status] || 'M'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}>
                      {f.path}
                    </span>
                    <span style={{ fontSize: 11, flexShrink: 0 }}>
                      <span style={{ color: '#107c10' }}>+{f.insertions}</span>
                      {' '}
                      <span style={{ color: '#d13438' }}>-{f.deletions}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Diff viewer */}
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              {/* Diff toolbar */}
              <div style={{
                background: 'white', borderRadius: '8px 8px 0 0', border: '1px solid #dadce0',
                borderBottom: 'none', padding: '8px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedFile || 'All changes'}
                  </span>
                  {diffViewMode === 'side-by-side' && (
                    <span style={{ fontSize: 11, color: '#5f6368' }}>
                      <span style={{ background: '#fdd8db', padding: '1px 6px', borderRadius: 3 }}>
                        {pr.target_branch}
                      </span>
                      {' ← left · right → '}
                      <span style={{ background: '#dff6dd', padding: '1px 6px', borderRadius: 3 }}>
                        {pr.source_branch}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setDiffViewMode('inline')}
                    style={{
                      padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                      background: diffViewMode === 'inline' ? '#0078d4' : 'white',
                      color: diffViewMode === 'inline' ? 'white' : '#1a1a1a', cursor: 'pointer',
                    }}
                  >
                    Inline
                  </button>
                  <button
                    onClick={() => setDiffViewMode('side-by-side')}
                    style={{
                      padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                      background: diffViewMode === 'side-by-side' ? '#0078d4' : 'white',
                      color: diffViewMode === 'side-by-side' ? 'white' : '#1a1a1a', cursor: 'pointer',
                    }}
                  >
                    Side by Side
                  </button>
                </div>
              </div>

              {/* Diff content */}
              <div style={{
                background: 'white', borderRadius: '0 0 8px 8px', border: '1px solid #dadce0',
                overflow: 'hidden', maxHeight: 'calc(100vh - 240px)',
              }}>
                <div ref={diffRef} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 240px)' }} />
              </div>

              {/* Inline comment form (floating) */}
              {inlineComment && (
                <div style={{
                  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                  width: 560, background: 'white', borderRadius: 8, padding: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '1px solid #dadce0', zIndex: 50,
                }}>
                  <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 8, fontFamily: 'monospace' }}>
                    {inlineComment.file}:{inlineComment.line} ({inlineComment.side === 'new' ? 'new' : 'old'})
                  </div>
                  <textarea
                    autoFocus
                    value={inlineCommentBody}
                    onChange={(e) => setInlineCommentBody(e.target.value)}
                    placeholder="Write a comment on this line..."
                    rows={3}
                    style={{
                      width: '100%', padding: 8, border: '1px solid #dadce0',
                      borderRadius: 4, fontSize: 13, resize: 'vertical',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setInlineComment(null); setInlineCommentBody(''); }
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitInlineComment();
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9aa0a6', marginRight: 'auto' }}>Cmd+Enter to submit</span>
                    <button
                      onClick={() => { setInlineComment(null); setInlineCommentBody(''); }}
                      style={{
                        padding: '6px 14px', background: '#f4f5f7', border: '1px solid #dadce0',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitInlineComment}
                      disabled={!inlineCommentBody.trim()}
                      style={{
                        padding: '6px 14px', background: '#0078d4', color: 'white',
                        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                        fontWeight: 600, opacity: inlineCommentBody.trim() ? 1 : 0.5,
                      }}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              )}

              {/* Inline comments displayed by file */}
              {fileComments.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#5f6368' }}>
                    Inline Comments
                  </div>
                  {fileComments
                    .filter((c) => !selectedFile || c.file_path === selectedFile)
                    .map((c) => (
                      <div key={c.id} style={{
                        background: 'white', border: '1px solid #dadce0', borderRadius: 6,
                        marginBottom: 8, overflow: 'hidden',
                      }}>
                        <div style={{
                          background: '#f4f5f7', padding: '6px 12px', fontSize: 12,
                          fontFamily: 'monospace', borderBottom: '1px solid #dadce0',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ color: '#0078d4' }}>{c.file_path}</span>
                          {c.line_number && <span style={{ color: '#5f6368' }}>line {c.line_number}</span>}
                        </div>
                        <div style={{ padding: 8 }}>
                          <CommentBlock
                            comment={c}
                            onResolve={resolveComment}
                            onDelete={deleteComment}
                            onReply={(id) => { setReplyTo(id); setCommentFile(c.file_path); setShowGeneralComment(true); }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ═══ COMMITS TAB ═══ */}
        {activeTab === 'commits' && (
          <div>
            {/* Commit list */}
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #dadce0', marginBottom: selectedCommit ? 16 : 0 }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #dadce0', fontWeight: 600, fontSize: 14 }}>
                Commits ({commits.length})
              </div>
              {commits.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>No commits</div>
              ) : commits.map((c) => (
                <div
                  key={c.sha}
                  onClick={() => loadCommitDiff(c.sha)}
                  style={{
                    padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 16,
                    cursor: 'pointer',
                    background: selectedCommit === c.sha ? '#e8f4fd' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (selectedCommit !== c.sha) e.currentTarget.style.background = '#f9f9f9'; }}
                  onMouseLeave={(e) => { if (selectedCommit !== c.sha) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{c.message.split('\n')[0]}</div>
                    <div style={{ fontSize: 12, color: '#5f6368' }}>
                      {c.author_name} · {new Date(c.authored_date).toLocaleDateString()}
                      {' · '}{c.files_changed} files
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.sha); }}
                      title="Click to copy full SHA"
                      style={{
                        fontSize: 12, fontFamily: 'monospace', background: selectedCommit === c.sha ? '#d0e8f7' : '#f4f5f7',
                        padding: '4px 8px', borderRadius: 4, height: 'fit-content',
                        color: '#0078d4', cursor: 'copy',
                      }}
                    >
                      {c.short_sha}
                    </code>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={selectedCommit === c.sha ? '#0078d4' : '#9aa0a6'} strokeWidth="2"
                      style={{ transform: selectedCommit === c.sha ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M3 5l4 4 4-4" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Commit diff viewer — file tree + diff, like Files tab */}
            {selectedCommit && (
              <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }}>
                {/* File tree for this commit */}
                <div style={{
                  background: 'white', borderRadius: 8, border: '1px solid #dadce0',
                  maxHeight: 'calc(100vh - 220px)', overflow: 'auto', position: 'sticky', top: 16,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #dadce0', fontSize: 13, fontWeight: 600 }}>
                    Changed Files ({commitFiles.length})
                  </div>
                  <div
                    onClick={() => setSelectedCommitFile(null)}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                      background: !selectedCommitFile ? '#e8f4fd' : 'transparent',
                      borderBottom: '1px solid #f0f0f0', fontWeight: 600,
                    }}
                  >
                    All files
                  </div>
                  {commitFiles.map((f) => {
                    const statusIcon: Record<string, string> = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R' };
                    const statusColors: Record<string, string> = { added: '#107c10', modified: '#ca5010', deleted: '#d13438', renamed: '#0078d4' };
                    return (
                      <div
                        key={f.path}
                        onClick={() => loadCommitFileDiff(selectedCommit!, f.path)}
                        style={{
                          padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                          background: selectedCommitFile === f.path ? '#e8f4fd' : 'transparent',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={(e) => { if (selectedCommitFile !== f.path) e.currentTarget.style.background = '#f9f9f9'; }}
                        onMouseLeave={(e) => { if (selectedCommitFile !== f.path) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: 3, fontSize: 11,
                          background: (statusColors[f.status] || '#5f6368') + '20',
                          color: statusColors[f.status] || '#5f6368',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, flexShrink: 0,
                        }}>
                          {statusIcon[f.status] || 'M'}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}>
                          {f.path}
                        </span>
                        <span style={{ fontSize: 11, flexShrink: 0 }}>
                          <span style={{ color: '#107c10' }}>+{f.insertions}</span>
                          {' '}
                          <span style={{ color: '#d13438' }}>-{f.deletions}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Diff viewer */}
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{
                    background: 'white', borderRadius: '8px 8px 0 0', border: '1px solid #dadce0',
                    borderBottom: 'none', padding: '8px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {selectedCommitFile || 'All changes'} — commit <code style={{ background: '#f4f5f7', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{selectedCommit.slice(0, 8)}</code>
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => setDiffViewMode('inline')}
                        style={{
                          padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                          background: diffViewMode === 'inline' ? '#0078d4' : 'white',
                          color: diffViewMode === 'inline' ? 'white' : '#1a1a1a', cursor: 'pointer',
                        }}
                      >Inline</button>
                      <button
                        onClick={() => setDiffViewMode('side-by-side')}
                        style={{
                          padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                          background: diffViewMode === 'side-by-side' ? '#0078d4' : 'white',
                          color: diffViewMode === 'side-by-side' ? 'white' : '#1a1a1a', cursor: 'pointer',
                        }}
                      >Side by Side</button>
                    </div>
                  </div>
                  <div style={{
                    background: 'white', borderRadius: '0 0 8px 8px', border: '1px solid #dadce0',
                    overflow: 'hidden', maxHeight: 'calc(100vh - 240px)',
                  }}>
                    <div ref={commitDiffRef} style={{ overflow: 'auto', maxHeight: 'calc(100vh - 240px)' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ═══ CONFLICTS TAB ═══ */}
        {activeTab === 'conflicts' && (
          <div>
            {conflictLoading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Checking for conflicts...</div>
            ) : conflictFiles.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 8, border: '1px solid #dadce0',
                padding: 48, textAlign: 'center',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#107c10', marginBottom: 4 }}>No Conflicts</div>
                <div style={{ fontSize: 13, color: '#5f6368' }}>
                  This pull request can be merged cleanly into {pr.target_branch}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }}>
                {/* Conflict file list */}
                <div style={{
                  background: 'white', borderRadius: 8, border: '1px solid #dadce0',
                  position: 'sticky', top: 16, maxHeight: 'calc(100vh - 220px)', overflow: 'auto',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid #dadce0',
                    fontSize: 13, fontWeight: 600, color: '#d13438',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="#d13438">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0z"/>
                    </svg>
                    {conflictFiles.length} Conflicting File{conflictFiles.length > 1 ? 's' : ''}
                  </div>
                  {conflictFiles.map((f) => {
                    const isResolved = conflictResolutions[f.path] &&
                      !conflictResolutions[f.path].includes('<<<<<<<') &&
                      !conflictResolutions[f.path].includes('>>>>>>>');
                    return (
                      <div
                        key={f.path}
                        onClick={() => setActiveConflictFile(f.path)}
                        style={{
                          padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                          background: activeConflictFile === f.path ? '#e8f4fd' : 'transparent',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={(e) => { if (activeConflictFile !== f.path) e.currentTarget.style.background = '#f9f9f9'; }}
                        onMouseLeave={(e) => { if (activeConflictFile !== f.path) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: 3, fontSize: 11,
                          background: isResolved ? '#dff6dd' : '#fdd8db',
                          color: isResolved ? '#107c10' : '#d13438',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, flexShrink: 0,
                        }}>
                          {isResolved ? '\u2713' : '!'}
                        </span>
                        <span style={{
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12,
                        }}>
                          {f.path}
                        </span>
                      </div>
                    );
                  })}

                  {/* Resolve all button */}
                  <div style={{ padding: 12 }}>
                    <button
                      onClick={resolveConflicts}
                      disabled={conflictResolving || conflictFiles.some((f) => {
                        const content = conflictResolutions[f.path] || '';
                        return content.includes('<<<<<<<') || content.includes('>>>>>>>');
                      })}
                      style={{
                        width: '100%', padding: '10px 16px', background: '#107c10', color: 'white',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        opacity: conflictFiles.some((f) => {
                          const content = conflictResolutions[f.path] || '';
                          return content.includes('<<<<<<<') || content.includes('>>>>>>>');
                        }) ? 0.5 : 1,
                      }}
                    >
                      {conflictResolving ? 'Resolving...' : 'Complete Merge with Resolutions'}
                    </button>
                  </div>
                </div>

                {/* Conflict editor */}
                <div style={{ minWidth: 0 }}>
                  {activeConflictFile && (() => {
                    const cf = conflictFiles.find((f) => f.path === activeConflictFile);
                    if (!cf) return null;
                    return (
                      <div>
                        {/* File header */}
                        <div style={{
                          background: 'white', borderRadius: '8px 8px 0 0', border: '1px solid #dadce0',
                          borderBottom: 'none', padding: '10px 16px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{cf.path}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setConflictResolutions((prev) => ({ ...prev, [cf.path]: cf.ours }))}
                              style={{
                                padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                                background: '#fdd8db', cursor: 'pointer', fontWeight: 600,
                              }}
                              title={`Accept ${pr.target_branch} version`}
                            >
                              Accept Ours ({pr.target_branch})
                            </button>
                            <button
                              onClick={() => setConflictResolutions((prev) => ({ ...prev, [cf.path]: cf.theirs }))}
                              style={{
                                padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
                                background: '#dff6dd', cursor: 'pointer', fontWeight: 600,
                              }}
                              title={`Accept ${pr.source_branch} version`}
                            >
                              Accept Theirs ({pr.source_branch})
                            </button>
                          </div>
                        </div>

                        {/* Side-by-side comparison (ours | theirs) */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr',
                          border: '1px solid #dadce0', borderBottom: 'none',
                          background: 'white',
                        }}>
                          <div style={{ borderRight: '1px solid #dadce0' }}>
                            <div style={{
                              padding: '6px 12px', background: '#fdd8db', fontSize: 12, fontWeight: 600,
                              borderBottom: '1px solid #dadce0', color: '#d13438',
                            }}>
                              Ours ({pr.target_branch})
                            </div>
                            <pre style={{
                              padding: 12, fontSize: 12, fontFamily: 'monospace', margin: 0,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 250, overflow: 'auto',
                              lineHeight: '18px', background: '#fff8f8',
                            }}>{cf.ours || '(empty)'}</pre>
                          </div>
                          <div>
                            <div style={{
                              padding: '6px 12px', background: '#dff6dd', fontSize: 12, fontWeight: 600,
                              borderBottom: '1px solid #dadce0', color: '#107c10',
                            }}>
                              Theirs ({pr.source_branch})
                            </div>
                            <pre style={{
                              padding: 12, fontSize: 12, fontFamily: 'monospace', margin: 0,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 250, overflow: 'auto',
                              lineHeight: '18px', background: '#f8fff8',
                            }}>{cf.theirs || '(empty)'}</pre>
                          </div>
                        </div>

                        {/* Editable resolution */}
                        <div style={{
                          background: 'white', borderRadius: '0 0 8px 8px',
                          border: '1px solid #dadce0',
                        }}>
                          <div style={{
                            padding: '8px 16px', borderBottom: '1px solid #dadce0',
                            fontSize: 12, fontWeight: 600, color: '#0078d4',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span>Resolved Content (edit below)</span>
                            {(() => {
                              const content = conflictResolutions[cf.path] || '';
                              const hasMarkers = content.includes('<<<<<<<') || content.includes('>>>>>>>');
                              return hasMarkers ? (
                                <span style={{ color: '#d13438', fontWeight: 400 }}>
                                  Contains conflict markers - resolve all conflicts before merging
                                </span>
                              ) : (
                                <span style={{ color: '#107c10' }}>Resolved</span>
                              );
                            })()}
                          </div>
                          <textarea
                            value={conflictResolutions[cf.path] || ''}
                            onChange={(e) => setConflictResolutions((prev) => ({ ...prev, [cf.path]: e.target.value }))}
                            style={{
                              width: '100%', minHeight: 400, padding: 12, border: 'none', resize: 'vertical',
                              fontFamily: "'SF Mono', Menlo, Monaco, Consolas, monospace",
                              fontSize: 12, lineHeight: '18px', outline: 'none',
                            }}
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ REVIEW MODAL ═══ */}
      {showReview && (
        <Modal onClose={() => setShowReview(false)}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Submit Review</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {Object.entries(voteDisplay).map(([value, { label, color }]) => (
              <label key={value} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 6, cursor: 'pointer',
                background: reviewVote === value ? color + '10' : '#f9f9f9',
                border: reviewVote === value ? `1px solid ${color}40` : '1px solid transparent',
              }}>
                <input type="radio" name="vote" value={value} checked={reviewVote === value}
                  onChange={(e) => setReviewVote(e.target.value)} />
                <span style={{ color, fontWeight: 600 }}>{label}</span>
              </label>
            ))}
          </div>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            placeholder="Add a comment with your review (optional)"
            rows={3}
            style={{ width: '100%', padding: 8, border: '1px solid #dadce0', borderRadius: 4, fontSize: 13, resize: 'vertical', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowReview(false)}
              style={{ padding: '8px 20px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={submitReview}
              style={{ padding: '8px 20px', background: '#0078d4', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              Submit Review
            </button>
          </div>
        </Modal>
      )}

      {/* ═══ MERGE MODAL ═══ */}
      {showMerge && (
        <Modal onClose={() => setShowMerge(false)}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Complete Pull Request</h2>

          {mergeCheck?.has_conflicts && (
            <div style={{ padding: 12, background: '#fdd8db', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              <strong style={{ color: '#d13438' }}>Merge conflicts detected</strong>
              <div style={{ marginTop: 4 }}>
                {mergeCheck.conflicting_files.map((f, i) => (
                  <div key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{f}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>Merge Strategy</label>
            {[
              { value: 'merge', label: 'Merge (no fast-forward)', desc: 'All commits preserved with a merge commit' },
              { value: 'squash', label: 'Squash commit', desc: 'Combine all commits into a single commit' },
              { value: 'rebase', label: 'Rebase', desc: 'Apply each commit onto the target branch' },
            ].map((s) => (
              <label key={s.value} style={{
                display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 6,
                cursor: 'pointer', marginBottom: 4,
                background: mergeStrategy === s.value ? '#e8f4fd' : '#f9f9f9',
              }}>
                <input type="radio" name="strategy" value={s.value}
                  checked={mergeStrategy === s.value}
                  onChange={(e) => setMergeStrategy(e.target.value)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#5f6368' }}>{s.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {mergeStrategy === 'squash' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>Commit Message</label>
              <textarea
                value={mergeMsg}
                onChange={(e) => setMergeMsg(e.target.value)}
                placeholder={`Squash merge branch '${pr.source_branch}' into ${pr.target_branch}`}
                rows={3}
                style={{ width: '100%', padding: 8, border: '1px solid #dadce0', borderRadius: 4, fontSize: 13, resize: 'vertical' }}
              />
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
            <input type="checkbox" checked={deleteSource} onChange={(e) => setDeleteSource(e.target.checked)} />
            Delete source branch after merging
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowMerge(false)}
              style={{ padding: '8px 20px', background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={executeMerge}
              disabled={mergeCheck?.has_conflicts}
              style={{
                padding: '8px 20px', background: '#107c10', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                opacity: mergeCheck?.has_conflicts ? 0.5 : 1,
              }}>
              Complete Merge
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable Components ───

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: 8, padding: 28, width: 520,
        maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {children}
      </div>
    </div>
  );
}

function CommentBlock({
  comment, onResolve, onDelete, onReply,
}: {
  comment: Comment;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
  onReply: (id: number) => void;
}) {
  return (
    <div style={{
      padding: 12, borderRadius: 6, marginBottom: 8,
      background: comment.status === 'resolved' ? '#f9f9f9' : '#fff',
      border: '1px solid #e8eaed',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13 }}>
          <strong>{comment.author}</strong>
          <span style={{ color: '#5f6368', marginLeft: 8, fontSize: 12 }}>
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {comment.status === 'resolved' && (
            <span style={{
              marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 8,
              background: '#dff6dd', color: '#107c10',
            }}>
              Resolved
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onReply(comment.id)}
            style={{ padding: '2px 8px', fontSize: 11, background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 3, cursor: 'pointer' }}>
            Reply
          </button>
          <button onClick={() => onResolve(comment.id)}
            style={{ padding: '2px 8px', fontSize: 11, background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 3, cursor: 'pointer' }}>
            {comment.status === 'resolved' ? 'Reactivate' : 'Resolve'}
          </button>
          <button onClick={() => onDelete(comment.id)}
            style={{ padding: '2px 8px', fontSize: 11, background: '#fdd8db', border: 'none', borderRadius: 3, cursor: 'pointer', color: '#d13438' }}>
            Delete
          </button>
        </div>
      </div>
      <div className="prv-markdown" style={{ fontSize: 13 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
      </div>
      {comment.file_path && (
        <div style={{ fontSize: 11, color: '#5f6368', marginTop: 4, fontFamily: 'monospace' }}>
          {comment.file_path}{comment.line_number ? `:${comment.line_number}` : ''}
        </div>
      )}
      {comment.replies.length > 0 && (
        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #e8eaed' }}>
          {comment.replies.map((r) => (
            <CommentBlock key={r.id} comment={r} onResolve={onResolve} onDelete={onDelete} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
