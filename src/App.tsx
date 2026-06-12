import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Shell } from './components/Shell';
import { Inbox } from './pages/Inbox';
import { InboxDetail } from './pages/InboxDetail';
import { WikiList } from './pages/WikiList';
import { DealWiki } from './pages/DealWiki';
import { Advice } from './pages/Advice';
import { AdviceDetail } from './pages/AdviceDetail';
import { Settings } from './pages/Settings';
import { SettingsDeals } from './pages/SettingsDeals';
import { SettingsDomains } from './pages/SettingsDomains';
import { SettingsMasking } from './pages/SettingsMasking';

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route element={<Shell />}>
          {/* 逆V字: 受信箱（②加工・昇り）→ 商談Wiki（頂点）→ 助言（③④・降り） */}
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:id" element={<InboxDetail />} />
          <Route path="/wiki" element={<WikiList />} />
          <Route path="/wiki/:dealId" element={<DealWiki />} />
          <Route path="/advice" element={<Advice />} />
          <Route path="/advice/:id" element={<AdviceDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/deals" element={<SettingsDeals />} />
          <Route path="/settings/domains" element={<SettingsDomains />} />
          <Route path="/settings/masking" element={<SettingsMasking />} />
          {/* 旧URL（/digest /projects /action 等）はすべて受信箱へ */}
          <Route path="*" element={<Navigate to="/inbox" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
