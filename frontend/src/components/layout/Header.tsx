import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settings.store';

export function Header({ breadcrumbs }: { breadcrumbs: { label: string; to?: string }[] }) {
  const { theme, toggleTheme } = useSettingsStore();
  const dark = theme === 'dark';

  return (
    <header style={{
      background: '#0078d4', color: 'white', padding: '12px 24px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* PRView logo / home link */}
      <Link to="/" style={{
        color: 'white', textDecoration: 'none', display: 'flex',
        alignItems: 'center', gap: 6,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3v12l6-3 6 3V3" />
        </svg>
        <span style={{ fontWeight: 600 }}>PRView</span>
      </Link>

      {/* Breadcrumbs */}
      {breadcrumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ opacity: 0.5 }}>/</span>
          {crumb.to ? (
            <Link to={crumb.to} style={{ color: 'white', textDecoration: 'none' }}>
              {crumb.label}
            </Link>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}

      {/* Right-side controls */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
            color: 'white', cursor: 'pointer', padding: '4px 10px', fontSize: 14,
          }}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? '\u2600' : '\u263D'}
        </button>

        {/* Settings gear link */}
        <Link
          to="/settings"
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
            color: 'white', padding: '4px 10px', fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
          }}
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
