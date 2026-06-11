import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Shell } from './components/Shell';
import { Ledger } from './pages/Ledger';
import { ActionDetail } from './pages/ActionDetail';
import { Inbox } from './pages/Inbox';
import { InboxDetail } from './pages/InboxDetail';
import { Settings } from './pages/Settings';
import { SettingsDeals } from './pages/SettingsDeals';
import { SettingsDomains } from './pages/SettingsDomains';
import { SettingsMasking } from './pages/SettingsMasking';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Shell />}>
          {/* ホームは「今日」（やる/待ち/済み）。受信箱は例外レビューに格下げ */}
          <Route path="/" element={<Ledger />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:id" element={<InboxDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/action/:id" element={<ActionDetail />} />
          {/* 旧URL互換 */}
          <Route path="/ledger" element={<Navigate to="/" replace />} />
          <Route path="/approvals" element={<Navigate to="/?tab=waiting" replace />} />
          <Route path="/archive" element={<Navigate to="/?tab=done" replace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/deals" element={<SettingsDeals />} />
          <Route path="/settings/domains" element={<SettingsDomains />} />
          <Route path="/settings/masking" element={<SettingsMasking />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
