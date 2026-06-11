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
import { ProjectDetail } from './pages/ProjectDetail';
import { Digest } from './pages/Digest';
import { Wiki } from './pages/Wiki';
import { CustomerDetail } from './pages/CustomerDetail';
import { PersonDetail } from './pages/PersonDetail';
import { SignalDetail } from './pages/SignalDetail';
import { MeetingDetail } from './pages/MeetingDetail';
import { DecisionDetail } from './pages/DecisionDetail';

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Shell />}>
          {/* ホームは「今日」（やる/待ち/済み）。受信箱は例外レビューに格下げ */}
          <Route path="/" element={<Ledger />} />
          <Route path="/digest" element={<Digest />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:id" element={<InboxDetail />} />
          {/* ナレッジ（wiki 層のハブ）: 案件/顧客/人物/会議/シグナル/意思決定 */}
          <Route path="/wiki" element={<Wiki />} />
          <Route path="/wiki/customer/:id" element={<CustomerDetail />} />
          <Route path="/wiki/person/:id" element={<PersonDetail />} />
          <Route path="/wiki/signal/:id" element={<SignalDetail />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
          <Route path="/decisions/:id" element={<DecisionDetail />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/action/:id" element={<ActionDetail />} />
          {/* 旧URL互換 */}
          <Route path="/ledger" element={<Navigate to="/" replace />} />
          <Route path="/approvals" element={<Navigate to="/?tab=waiting" replace />} />
          <Route path="/archive" element={<Navigate to="/?tab=done" replace />} />
          <Route path="/projects" element={<Navigate to="/wiki" replace />} />
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
