/**
 * Avatar — generates a colored circle with initials from a name.
 * Uses a deterministic hash of the name to produce a consistent HSL hue.
 */
export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  // Deterministic hash to generate a hue (0-360)
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = Math.abs(hash) % 360;

  // Extract initials: first letter of first two words, or first two letters
  const parts = name.trim().split(/\s+/);
  let initials: string;
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (name.length >= 2) {
    initials = name.slice(0, 2).toUpperCase();
  } else {
    initials = name.toUpperCase();
  }

  const fontSize = Math.max(Math.round(size * 0.42), 9);

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hue}, 55%, 50%)`,
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
      }}
      title={name}
    >
      {initials}
    </span>
  );
}
