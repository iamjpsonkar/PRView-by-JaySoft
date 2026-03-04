import React from 'react';

interface DiffToolbarProps {
  title: string;
  subtitle?: string;
  diffViewMode: 'inline' | 'side-by-side';
  onModeChange: (mode: 'inline' | 'side-by-side') => void;
  extraControls?: React.ReactNode;
}

export function DiffToolbar({
  title, subtitle, diffViewMode, onModeChange, extraControls,
}: DiffToolbarProps) {
  return (
    <div style={{
      background: 'white', borderRadius: '8px 8px 0 0', border: '1px solid #dadce0',
      borderBottom: 'none', padding: '8px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 11, color: '#5f6368' }}>
            {subtitle}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {extraControls}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onModeChange('inline')}
            style={{
              padding: '4px 12px', fontSize: 12, border: '1px solid #dadce0', borderRadius: 4,
              background: diffViewMode === 'inline' ? '#0078d4' : 'white',
              color: diffViewMode === 'inline' ? 'white' : '#1a1a1a', cursor: 'pointer',
            }}
          >
            Inline
          </button>
          <button
            onClick={() => onModeChange('side-by-side')}
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
    </div>
  );
}
