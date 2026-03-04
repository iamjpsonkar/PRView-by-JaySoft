import { Routes, Route, Navigate } from 'react-router-dom';
import { RepoSelectPage } from './pages/RepoSelectPage';
import { PRListPage } from './pages/PRListPage';
import { PRDetailPage } from './pages/PRDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RepoSelectPage />} />
      <Route path="/repos/:repoId/prs" element={<PRListPage />} />
      <Route path="/repos/:repoId/prs/:prId" element={<PRDetailPage />} />
      <Route path="/repos/:repoId/prs/:prId/:tab" element={<PRDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
