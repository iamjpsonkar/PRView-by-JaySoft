export function LabelBadge({
  name, color, onRemove,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 12,
      background: color + '20', color: color,
      fontSize: 12, fontWeight: 600, lineHeight: '20px',
    }}>
      {name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: color, fontSize: 14, lineHeight: 1, padding: 0,
            marginLeft: 2, display: 'flex', alignItems: 'center',
          }}
          title={`Remove ${name}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
