import { useStore } from '../store/StoreContext';

/** トースト（§10）。右下に2.5秒表示。文言は3種のみ。 */
export function Toaster() {
  const { toasts } = useStore();
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          style={{ animation: 'toast-in 150ms ease-out' }}
        >
          {t.message}
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
