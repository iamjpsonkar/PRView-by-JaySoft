import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Mode = 'write' | 'preview' | 'split';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function MarkdownEditor({ value, onChange, placeholder = 'Write markdown...', minHeight = 120 }: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>('write');
  const [preview, setPreview] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (mode === 'preview') {
      setPreview(value);
    } else if (mode === 'split') {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPreview(value), 150);
    }
    return () => clearTimeout(timerRef.current);
  }, [value, mode]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 12, fontWeight: active ? 600 : 400,
    border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer',
    background: active ? '#0078d4' : 'white', color: active ? 'white' : '#1a1a1a',
  });

  const textareaStyle: React.CSSProperties = {
    width: '100%', minHeight, padding: '8px 12px', border: '1px solid #dadce0',
    borderRadius: 6, fontSize: 14, resize: 'vertical', fontFamily: 'inherit',
    outline: 'none',
  };

  const previewStyle: React.CSSProperties = {
    minHeight, padding: '8px 12px', border: '1px solid #dadce0',
    borderRadius: 6, fontSize: 14, overflow: 'auto', background: '#fafafa',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['write', 'preview', 'split'] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={tabStyle(mode === m)}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === 'write' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={textareaStyle}
        />
      )}

      {mode === 'preview' && (
        <div style={previewStyle} className="prv-markdown">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <span style={{ color: '#9aa0a6' }}>Nothing to preview</span>
          )}
        </div>
      )}

      {mode === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={textareaStyle}
          />
          <div style={previewStyle} className="prv-markdown">
            {preview ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
            ) : (
              <span style={{ color: '#9aa0a6' }}>Nothing to preview</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
