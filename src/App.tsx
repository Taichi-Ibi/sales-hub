import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Shell } from './components/Shell';
import { Ledger } from './pages/Ledger';
import { ActionDetail } from './pages/ActionDetail';
import { Inbox } from './pages/Inbox';
import { InboxDetail } from './pages/InboxDetail';
import { Approvals } from './pages/Approvals';
import { Archive } from './pages/Archive';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Ledger />} />
          <Route path="/action/:id" element={<ActionDetail />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:id" element={<InboxDetail />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
