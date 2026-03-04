// ─── Shared TypeScript Interfaces ───
// Extracted from PRDetailPage.tsx and PRListPage.tsx

export interface PR {
  id: number;
  repo_id: string;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  status: string;
  author: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  comment_count: number;
  review_summary: Record<string, string>;
  required_reviewers: string[];
  approval_status: Record<string, string>;
  labels: Label[];
  ai_summary: string | null;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  description: string;
}

export interface DiffFile {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
  old_path?: string;
}

export interface DiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}

export interface Commit {
  sha: string;
  short_sha: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  files_changed: number;
}

export interface Comment {
  id: number;
  pr_id: number;
  parent_id: number | null;
  file_path: string | null;
  line_number: number | null;
  line_type: string | null;
  body: string;
  author: string;
  status: string;
  suggestion: string | null;
  suggestion_applied: number;
  is_ai_generated: boolean;
  ai_agent_name: string | null;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface Review {
  id: number;
  pr_id: number;
  reviewer: string;
  vote: string;
  body: string;
  created_at: string;
  is_ai_generated: boolean;
  ai_agent_name: string | null;
}

export interface ConflictFile {
  path: string;
  conflict_content: string;
  ours: string;
  theirs: string;
  base: string;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  commit_sha: string;
  commit_message: string;
}

export interface ChecklistItem {
  id: number;
  pr_id: number;
  label: string;
  checked: boolean;
  details: string | null;
  category: string | null;
  author: string;
  created_at: string;
  updated_at: string;
}
