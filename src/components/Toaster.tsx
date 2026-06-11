import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

/** トースト（§10）。右下に2.5秒表示。 */
export function Toaster() {
  const { toasts, dismissToast } = useStore();
  const navigate = useNavigate();
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-xs items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg sm:max-w-sm"
          style={{ animation: 'toast-in 150ms ease-out' }}
        >
          <span className="min-w-0 flex-1">{t.message}</span>
          {t.actionId && (
            <button
              onClick={() => {
                dismissToast(t.id);
                navigate(`/action/${t.actionId}`, { state: { from: '/ledger' } });
              }}
              className="shrink-0 whitespace-nowrap text-xs font-normal text-white/70 underline hover:text-white"
            >
              {t.actionTitle ? `${t.actionTitle} →` : '開く →'}
            </button>
          )}
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
