import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useRepoStore } from '../stores/repo.store';

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
  const [prs, setPrs] = useState<PR[]>([]);
  const [filter, setFilter] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [newPR, setNewPR] = useState({ title: '', description: '', source_branch: '', target_branch: '', status: 'active' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repoId) return;
    loadPRs();
    api.get<BranchInfo[]>(`/repos/${repoId}/branches`).then(setBranches).catch(() => {});
  }, [repoId, filter]);

  const loadPRs = async () => {
    setLoading(true);
    try {
      const data = await api.get<PR[]>(`/repos/${repoId}/prs?status=${filter}`);
      setPrs(data);
    } catch { setPrs([]); }
    setLoading(false);
  };

  const createPR = async () => {
    if (!newPR.title || !newPR.source_branch || !newPR.target_branch) return;
    try {
      const pr = await api.post<PR>(`/repos/${repoId}/prs`, newPR);
      setShowCreate(false);
      setNewPR({ title: '', description: '', source_branch: '', target_branch: '', status: 'active' });
      navigate(`/repos/${repoId}/prs/${pr.id}`);
    } catch (e: any) {
      alert(e.message);
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
      {/* Header */}
      <header style={{
        background: '#0078d4', color: 'white', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3v12l6-3 6 3V3" />
          </svg>
          <span style={{ fontWeight: 600 }}>PRView</span>
        </Link>
        <span style={{ opacity: 0.7 }}>/</span>
        <span style={{ fontWeight: 600 }}>{repoName || repoId}</span>
        <span style={{ opacity: 0.7 }}>/</span>
        <span>Pull Requests</span>
      </header>

      <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 24px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['active', 'draft', 'completed', 'abandoned'].map((s) => (
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

        {/* PR List */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>Loading...</div>
          ) : prs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>
              No {filter} pull requests
            </div>
          ) : (
            prs.map((pr) => (
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Source Branch</label>
              <select
                value={newPR.source_branch}
                onChange={(e) => setNewPR({ ...newPR, source_branch: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #dadce0',
                  borderRadius: 6, fontSize: 14,
                }}
              >
                <option value="">Select source branch...</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Target Branch</label>
              <select
                value={newPR.target_branch}
                onChange={(e) => setNewPR({ ...newPR, target_branch: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #dadce0',
                  borderRadius: 6, fontSize: 14,
                }}
              >
                <option value="">Select target branch...</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

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
