import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar } from '../layout/Avatar';
import type { Comment } from '../../types';

export function CommentBlock({
  comment, onResolve, onDelete, onReply,
}: {
  comment: Comment;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
  onReply: (id: number) => void;
}) {
  return (
    <div style={{
      padding: 12, borderRadius: 6, marginBottom: 8,
      background: comment.status === 'resolved' ? '#f9f9f9' : '#fff',
      border: '1px solid #e8eaed',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Avatar name={comment.author} size={22} />
          <strong>{comment.author}</strong>
          {comment.is_ai_generated && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8,
              background: '#e8f0fe', color: '#1a73e8', fontWeight: 600,
            }}>
              AI{comment.ai_agent_name ? ` \u00b7 ${comment.ai_agent_name}` : ''}
            </span>
          )}
          <span style={{ color: '#5f6368', marginLeft: 4, fontSize: 12 }}>
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {comment.status === 'resolved' && (
            <span style={{
              marginLeft: 4, fontSize: 11, padding: '1px 6px', borderRadius: 8,
              background: '#dff6dd', color: '#107c10',
            }}>
              Resolved
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onReply(comment.id)}
            style={{
              padding: '2px 8px', fontSize: 11, background: '#f4f5f7',
              border: '1px solid #dadce0', borderRadius: 3, cursor: 'pointer',
            }}
          >
            Reply
          </button>
          <button
            onClick={() => onResolve(comment.id)}
            style={{
              padding: '2px 8px', fontSize: 11, background: '#f4f5f7',
              border: '1px solid #dadce0', borderRadius: 3, cursor: 'pointer',
            }}
          >
            {comment.status === 'resolved' ? 'Reactivate' : 'Resolve'}
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            style={{
              padding: '2px 8px', fontSize: 11, background: '#fdd8db',
              border: 'none', borderRadius: 3, cursor: 'pointer', color: '#d13438',
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="prv-markdown" style={{ fontSize: 13 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.body}</ReactMarkdown>
      </div>
      {comment.file_path && (
        <div style={{ fontSize: 11, color: '#5f6368', marginTop: 4, fontFamily: 'monospace' }}>
          {comment.file_path}{comment.line_number ? `:${comment.line_number}` : ''}
        </div>
      )}
      {comment.replies.length > 0 && (
        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #e8eaed' }}>
          {comment.replies.map((r) => (
            <CommentBlock
              key={r.id}
              comment={r}
              onResolve={onResolve}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
