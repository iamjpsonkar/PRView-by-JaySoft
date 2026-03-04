import { Modal } from './Modal';

export const SHORTCUTS = [
  { group: 'Navigation', keys: [
    { key: '1', desc: 'Overview tab' },
    { key: '2', desc: 'Files tab' },
    { key: '3', desc: 'Commits tab' },
    { key: '4', desc: 'Conflicts tab' },
  ]},
  { group: 'File Navigation', keys: [
    { key: 'j', desc: 'Next file' },
    { key: 'k', desc: 'Previous file' },
    { key: 'a', desc: 'Show all files (deselect)' },
  ]},
  { group: 'General', keys: [
    { key: '?', desc: 'Show keyboard shortcuts' },
    { key: 'Esc', desc: 'Close modal / cancel' },
  ]},
];

export function ShortcutHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <Modal onClose={onClose}>
      <div style={{ width: 440 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Keyboard Shortcuts</h2>
        {SHORTCUTS.map((group) => (
          <div key={group.group} style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
              color: '#5f6368', marginBottom: 8, letterSpacing: '0.5px',
            }}>
              {group.group}
            </h3>
            {group.keys.map((shortcut) => (
              <div
                key={shortcut.key}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid #f0f0f0',
                }}
              >
                <span style={{ fontSize: 14, color: '#1a1a1a' }}>{shortcut.desc}</span>
                <kbd style={{
                  background: '#f4f5f7', border: '1px solid #dadce0', borderRadius: 4,
                  padding: '2px 8px', fontSize: 13, fontFamily: 'monospace',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)', minWidth: 28, textAlign: 'center',
                }}>
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
