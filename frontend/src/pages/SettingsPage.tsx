import { Link } from 'react-router-dom';
import { useSettingsStore } from '../stores/settings.store';

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s\-_]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#0078d4', '#107c10', '#ca5010', '#8764b8',
    '#d13438', '#008272', '#4f6bed', '#c239b3',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function SettingsPage() {
  const {
    displayName, diffViewMode, defaultMergeStrategy, theme,
    setDisplayName, setDiffViewMode, setDefaultMergeStrategy, toggleTheme,
  } = useSettingsStore();

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 6,
    fontSize: 14,
    color: '#1a1a1a',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 12,
  };

  const radioGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
    paddingBottom: 32,
    borderBottom: '1px solid #e8eaed',
  };

  const makeRadioButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    border: isSelected ? '2px solid #0078d4' : '1px solid #dadce0',
    borderRadius: 6,
    background: isSelected ? '#e8f4fd' : 'white',
    color: isSelected ? '#0078d4' : '#1a1a1a',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: isSelected ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Header */}
      <header style={{
        background: '#0078d4', color: 'white', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3v12l6-3 6 3V3" />
          </svg>
          <span style={{ fontWeight: 600 }}>PRView</span>
        </Link>
        <span style={{ opacity: 0.7 }}>/</span>
        <span>Settings</span>
      </header>

      <div style={{ maxWidth: 720, margin: '48px auto', padding: '0 24px' }}>
        <div style={{
          background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: 32,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Settings</h2>
          <p style={{ color: '#5f6368', marginBottom: 32 }}>
            Configure your PRView preferences.
          </p>

          {/* Display Name */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Display Name</label>
            <p style={descStyle}>
              Your name as it appears on comments and reviews.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: getAvatarColor(displayName),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 18,
                flexShrink: 0,
              }}>
                {getInitials(displayName)}
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid #dadce0',
                  borderRadius: 6, fontSize: 14, outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Diff View Mode */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Diff View Mode</label>
            <p style={descStyle}>
              Choose how file diffs are displayed when reviewing changes.
            </p>
            <div style={radioGroupStyle}>
              {([
                { value: 'side-by-side' as const, label: 'Side by Side' },
                { value: 'inline' as const, label: 'Inline' },
              ]).map((option) => (
                <label
                  key={option.value}
                  style={makeRadioButtonStyle(diffViewMode === option.value)}
                >
                  <input
                    type="radio"
                    name="diffViewMode"
                    value={option.value}
                    checked={diffViewMode === option.value}
                    onChange={() => setDiffViewMode(option.value)}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: diffViewMode === option.value ? '5px solid #0078d4' : '2px solid #dadce0',
                    display: 'inline-block', flexShrink: 0,
                    background: 'white',
                  }} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Default Merge Strategy */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Default Merge Strategy</label>
            <p style={descStyle}>
              The default merge method selected when completing a pull request.
            </p>
            <div style={radioGroupStyle}>
              {([
                { value: 'merge' as const, label: 'Merge Commit' },
                { value: 'squash' as const, label: 'Squash' },
                { value: 'rebase' as const, label: 'Rebase' },
              ]).map((option) => (
                <label
                  key={option.value}
                  style={makeRadioButtonStyle(defaultMergeStrategy === option.value)}
                >
                  <input
                    type="radio"
                    name="defaultMergeStrategy"
                    value={option.value}
                    checked={defaultMergeStrategy === option.value}
                    onChange={() => setDefaultMergeStrategy(option.value)}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: defaultMergeStrategy === option.value ? '5px solid #0078d4' : '2px solid #dadce0',
                    display: 'inline-block', flexShrink: 0,
                    background: 'white',
                  }} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Theme</label>
            <p style={descStyle}>
              Choose between light and dark appearance.
            </p>
            <div style={radioGroupStyle}>
              {([
                { value: 'light' as const, label: 'Light' },
                { value: 'dark' as const, label: 'Dark' },
              ]).map((option) => (
                <label
                  key={option.value}
                  style={makeRadioButtonStyle(theme === option.value)}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => { if (theme !== option.value) toggleTheme(); }}
                    style={{ display: 'none' }}
                  />
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: theme === option.value ? '5px solid #0078d4' : '2px solid #dadce0',
                    display: 'inline-block', flexShrink: 0,
                    background: 'white',
                  }} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
