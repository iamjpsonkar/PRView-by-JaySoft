import React from 'react';

type DiffViewMode = 'inline' | 'side-by-side' | 'existing' | 'modified';

interface DiffToolbarProps {
  title: string;
  subtitle?: string;
  diffViewMode: DiffViewMode;
  onModeChange: (mode: DiffViewMode) => void;
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
          {(['inline', 'side-by-side', 'existing', 'modified'] as DiffViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
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
    </div>
  );
}
