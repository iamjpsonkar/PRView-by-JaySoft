import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useRepoStore } from '../stores/repo.store';
import { useSettingsStore } from '../stores/settings.store';
import { Header } from '../components/layout/Header';
import { useToast } from '../components/layout/ToastProvider';
import { LabelBadge } from '../components/pr/LabelBadge';

interface PRLabel {
  id: number;
  name: string;
  color: string;
  description: string;
}

interface PR {
  id: number;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  status: string;
  author: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
  review_summary: Record<string, string>;
  labels: PRLabel[];
}

interface BranchInfo {
  name: string;
  is_current: boolean;
  commit_sha: string;
  commit_message: string;
}

export function PRListPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { repoName, setRepo } = useRepoStore();
  const { addToast } = useToast();
  const [prs, setPrs] = useState<PR[]>([]);
  const [filter, setFilter] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [newPR, setNewPR] = useState({ title: '', description: '', source_branch: '', target_branch: '', status: 'active' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!repoId) return;
    loadPRs();
    api.get<BranchInfo[]>(`/repos/${repoId}/branches`).then(setBranches).catch(() => {});
  }, [repoId, filter]);

  const loadPRs = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? `/repos/${repoId}/prs` : `/repos/${repoId}/prs?status=${filter}`;
      const data = await api.get<PR[]>(url);
      setPrs(data);
    } catch { setPrs([]); }
    setLoading(false);
  };

  const filteredPRs = prs.filter((pr) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return pr.title.toLowerCase().includes(q)
      || pr.source_branch.toLowerCase().includes(q)
      || pr.target_branch.toLowerCase().includes(q)
      || pr.author.toLowerCase().includes(q)
      || `#${pr.id}`.includes(q);
  });

  const createPR = async () => {
    if (!newPR.title || !newPR.source_branch || !newPR.target_branch) return;
    try {
      const pr = await api.post<PR>(`/repos/${repoId}/prs`, newPR);
      setShowCreate(false);
      setNewPR({ title: '', description: '', source_branch: '', target_branch: '', status: 'active' });
      navigate(`/repos/${repoId}/prs/${pr.id}`);
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const statusColor: Record<string, string> = {
    active: '#0078d4',
    draft: '#ca5010',
    completed: '#107c10',
    abandoned: '#8a8886',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      <Header breadcrumbs={[
        { label: repoName || repoId || '', to: `/repos/${repoId}/prs` },
        { label: 'Pull Requests' },
      ]} />

      <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 24px' }}>
        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pull requests by title, branch, or author..."
            style={{
              width: '100%', padding: '10px 14px', border: '1px solid #dadce0',
              borderRadius: 6, fontSize: 14, outline: 'none', background: 'white',
            }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['active', 'draft', 'completed', 'abandoned', 'all'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '8px 16px', border: '1px solid #dadce0', borderRadius: 6,
                  background: filter === s ? '#0078d4' : 'white',
                  color: filter === s ? 'white' : '#1a1a1a',
                  cursor: 'pointer', fontSize: 13, fontWeight: filter === s ? 600 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/repos/${repoId}/compare`)}
              style={{
                padding: '8px 16px', background: 'white', color: '#0078d4',
                border: '1px solid #0078d4', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
              }}
            >
              Compare Branches
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '8px 20px', background: '#107c10', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
              }}
            >
              + New Pull Request
            </button>
          </div>
        </div>

        {/* PR List */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Loading...</div>
          ) : filteredPRs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>
              {search ? `No results for "${search}"` : `No ${filter} pull requests`}
            </div>
          ) : (
            filteredPRs.map((pr) => (
              <div
                key={pr.id}
                onClick={() => navigate(`/repos/${repoId}/prs/${pr.id}`)}
                style={{
                  padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 10, background: statusColor[pr.status] + '18',
                      color: statusColor[pr.status], textTransform: 'uppercase',
                    }}>
                      {pr.status}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{pr.title}</span>
                    {pr.labels?.length > 0 && pr.labels.map((l) => (
                      <LabelBadge key={l.id} name={l.name} color={l.color} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: '#5f6368' }}>
                    #{pr.id} · {pr.source_branch} → {pr.target_branch} · {pr.author}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#5f6368', whiteSpace: 'nowrap' }}>
                  <div>{new Date(pr.created_at).toLocaleDateString()}</div>
                  {pr.comment_count > 0 && (
                    <div style={{ marginTop: 4 }}>💬 {pr.comment_count}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create PR Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
        onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div style={{
            background: 'white', borderRadius: 8, padding: 32, width: 560,
            maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Create Pull Request</h2>

            <BranchPicker
              label="Source Branch"
              value={newPR.source_branch}
              branches={branches}
              onChange={(name) => setNewPR({ ...newPR, source_branch: name })}
            />

            <BranchPicker
              label="Target Branch"
              value={newPR.target_branch}
              branches={branches}
              onChange={(name) => setNewPR({ ...newPR, target_branch: name })}
            />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Title</label>
              <input
                value={newPR.title}
                onChange={(e) => setNewPR({ ...newPR, title: e.target.value })}
                placeholder="PR title"
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #dadce0',
                  borderRadius: 6, fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Description</label>
              <textarea
                value={newPR.description}
                onChange={(e) => setNewPR({ ...newPR, description: e.target.value })}
                placeholder="Describe your changes (Markdown supported)"
                rows={4}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #dadce0',
                  borderRadius: 6, fontSize: 14, resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={newPR.status === 'draft'}
                  onChange={(e) => setNewPR({ ...newPR, status: e.target.checked ? 'draft' : 'active' })}
                />
                Create as draft
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '8px 20px', background: '#f4f5f7', border: '1px solid #dadce0',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createPR}
                disabled={!newPR.title || !newPR.source_branch || !newPR.target_branch}
                style={{
                  padding: '8px 20px', background: '#0078d4', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                  opacity: (!newPR.title || !newPR.source_branch || !newPR.target_branch) ? 0.6 : 1,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchPicker({
  label, value, branches, onChange,
}: {
  label: string;
  value: string;
  branches: BranchInfo[];
  onChange: (name: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ marginBottom: 16, position: 'relative' }} ref={ref}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{label}</label>
      <div
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '8px 12px', border: '1px solid #dadce0',
          borderRadius: 6, fontSize: 14, cursor: 'pointer', background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ color: value ? '#1a1a1a' : '#9aa0a6' }}>
          {value || `Select ${label.toLowerCase()}...`}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#5f6368" strokeWidth="2">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1px solid #dadce0', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 4,
          maxHeight: 260, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches..."
              style={{
                width: '100%', padding: '6px 10px', border: '1px solid #dadce0',
                borderRadius: 4, fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', color: '#5f6368', fontSize: 13 }}>
                No branches found
              </div>
            ) : (
              filtered.map((b) => (
                <div
                  key={b.name}
                  onClick={() => { onChange(b.name); setOpen(false); setSearch(''); }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: value === b.name ? '#e8f4fd' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (value !== b.name) e.currentTarget.style.background = '#f9f9f9'; }}
                  onMouseLeave={(e) => { if (value !== b.name) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 12,
                      fontWeight: b.is_current ? 700 : 400,
                    }}>
                      {b.name}
                    </span>
                    {b.is_current && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 8,
                        background: '#dff6dd', color: '#107c10',
                      }}>
                        HEAD
                      </span>
                    )}
                  </div>
                  {value === b.name && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0078d4" strokeWidth="2">
                      <path d="M3 7l3 3 5-5" />
                    </svg>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
