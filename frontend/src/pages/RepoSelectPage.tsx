import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useRepoStore } from '../stores/repo.store';
import { Header } from '../components/layout/Header';
import { useToast } from '../components/layout/ToastProvider';

interface RepoInfo {
  id: string;
  name: string;
  path: string;
  last_opened: string;
}

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_git_repo: boolean;
}

interface ValidateResponse {
  valid: boolean;
  name?: string;
  branch_count?: number;
  error?: string;
}

export function RepoSelectPage() {
  const navigate = useNavigate();
  const setRepo = useRepoStore((s) => s.setRepo);
  const { addToast } = useToast();
  const [path, setPath] = useState('');
  const [recentRepos, setRecentRepos] = useState<RepoInfo[]>([]);
  const [browseEntries, setBrowseEntries] = useState<DirEntry[]>([]);
  const [browsePath, setBrowsePath] = useState('~');
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  useEffect(() => {
    api.get<RepoInfo[]>('/repos/recent').then(setRecentRepos).catch(() => {});
  }, []);

  useEffect(() => {
    if (showBrowser) {
      api.get<DirEntry[]>(`/repos/browse?path=${encodeURIComponent(browsePath)}`)
        .then(setBrowseEntries)
        .catch(() => setBrowseEntries([]));
    }
  }, [browsePath, showBrowser]);

  const validateRepo = async () => {
    if (!path.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<ValidateResponse>('/repos/validate', { path: path.trim() });
      setValidation(res);
    } catch {
      setValidation({ valid: false, error: 'Failed to validate' });
    }
    setLoading(false);
  };

  const selectRepo = async (repoPath: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ repo_id: string; name: string; path: string }>('/repos/select', { path: repoPath });
      setRepo(res.repo_id, res.name, res.path);
      navigate(`/repos/${res.repo_id}/prs`);
    } catch (e: any) {
      addToast('error', e.message);
    }
    setLoading(false);
  };

  const navigateBrowser = (dir: DirEntry) => {
    if (dir.is_git_repo) {
      setShowBrowser(false);
      selectRepo(dir.path);
    } else {
      setBrowsePath(dir.path);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      <Header breadcrumbs={[]} />

      <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px' }}>
        <div style={{
          background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: 32
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Select a Repository</h2>
          <p style={{ color: '#5f6368', marginBottom: 24 }}>
            Enter the path to a local git repository to start reviewing code.
          </p>

          {/* Path input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              value={path}
              onChange={(e) => { setPath(e.target.value); setValidation(null); }}
              onKeyDown={(e) => e.key === 'Enter' && validateRepo()}
              placeholder="/path/to/your/repo"
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid #dadce0',
                borderRadius: 6, fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={() => setShowBrowser(!showBrowser)}
              style={{
                padding: '10px 16px', background: '#f4f5f7', border: '1px solid #dadce0',
                borderRadius: 6, cursor: 'pointer', fontSize: 14,
              }}
            >
              Browse
            </button>
            <button
              onClick={validateRepo}
              disabled={loading || !path.trim()}
              style={{
                padding: '10px 20px', background: '#0078d4', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
                opacity: loading || !path.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Validating...' : 'Validate'}
            </button>
          </div>

          {/* Validation result */}
          {validation && (
            <div style={{
              padding: 12, borderRadius: 6, marginBottom: 16,
              background: validation.valid ? '#dff6dd' : '#fdd8db',
              color: validation.valid ? '#107c10' : '#d13438',
            }}>
              {validation.valid ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Valid git repository: <strong>{validation.name}</strong> ({validation.branch_count} branches)
                  </span>
                  <button
                    onClick={() => selectRepo(path.trim())}
                    style={{
                      padding: '6px 16px', background: '#107c10', color: 'white',
                      border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Open Repository
                  </button>
                </div>
              ) : (
                <span>{validation.error}</span>
              )}
            </div>
          )}

          {/* Directory Browser */}
          {showBrowser && (
            <div style={{
              border: '1px solid #dadce0', borderRadius: 6, marginBottom: 16,
              maxHeight: 300, overflow: 'auto',
            }}>
              <div style={{
                padding: '8px 12px', background: '#f4f5f7', borderBottom: '1px solid #dadce0',
                fontSize: 13, color: '#5f6368', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <button
                  onClick={() => setBrowsePath(browsePath.split('/').slice(0, -1).join('/') || '/')}
                  style={{
                    padding: '2px 8px', background: 'white', border: '1px solid #dadce0',
                    borderRadius: 4, cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Up
                </button>
                <span style={{ fontFamily: 'monospace' }}>{browsePath}</span>
              </div>
              {browseEntries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => navigateBrowser(entry)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 8, borderBottom: '1px solid #f0f0f0',
                    background: entry.is_git_repo ? '#f0f7ff' : 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = entry.is_git_repo ? '#e0efff' : '#f9f9f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = entry.is_git_repo ? '#f0f7ff' : 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>{entry.is_git_repo ? '📦' : '📁'}</span>
                  <span style={{ fontWeight: entry.is_git_repo ? 600 : 400 }}>{entry.name}</span>
                  {entry.is_git_repo && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, color: '#0078d4',
                      background: '#e0efff', padding: '2px 8px', borderRadius: 10,
                    }}>
                      Git Repo
                    </span>
                  )}
                </div>
              ))}
              {browseEntries.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: '#5f6368' }}>
                  No directories found
                </div>
              )}
            </div>
          )}

          {/* Recent repos */}
          {recentRepos.length > 0 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#5f6368' }}>
                Recent Repositories
              </h3>
              {recentRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => selectRepo(repo.path)}
                  style={{
                    padding: '12px 16px', border: '1px solid #dadce0', borderRadius: 6,
                    marginBottom: 8, cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{repo.name}</div>
                    <div style={{ fontSize: 13, color: '#5f6368', fontFamily: 'monospace' }}>
                      {repo.path}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#5f6368' }}>
                    {new Date(repo.last_opened).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
