import { Routes, Route, Navigate } from 'react-router-dom';
import { RepoSelectPage } from './pages/RepoSelectPage';
import { PRListPage } from './pages/PRListPage';
import { PRDetailPage } from './pages/PRDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ComparePage } from './pages/ComparePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RepoSelectPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/repos/:repoId/prs" element={<PRListPage />} />
      <Route path="/repos/:repoId/prs/:prId" element={<PRDetailPage />} />
      <Route path="/repos/:repoId/prs/:prId/:tab" element={<PRDetailPage />} />
      <Route path="/repos/:repoId/compare" element={<ComparePage />} />
      <Route path="/repos/:repoId/compare/:branches" element={<ComparePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
