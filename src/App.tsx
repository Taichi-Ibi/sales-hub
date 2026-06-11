import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Shell } from './components/Shell';
import { Ledger } from './pages/Ledger';
import { ActionDetail } from './pages/ActionDetail';
import { Inbox } from './pages/Inbox';
import { InboxDetail } from './pages/InboxDetail';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Inbox />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/action/:id" element={<ActionDetail />} />
          <Route path="/inbox/:id" element={<InboxDetail />} />
          {/* 旧URL互換: FS承認/完了済みは台帳のタブに統合した */}
          <Route path="/approvals" element={<Navigate to="/ledger?tab=waiting" replace />} />
          <Route path="/archive" element={<Navigate to="/ledger?tab=done" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
