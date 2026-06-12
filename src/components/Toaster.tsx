import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

/** 操作結果の通知。装飾・アニメーションなしの素朴な枠（DESIGN.md §4）。 */
export function Toaster() {
  const { toasts, dismissToast } = useStore();
  const navigate = useNavigate();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-1" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="border border-line bg-surface px-3 py-1.5 text-[13px]">
          {t.message}
          {t.adviceId && (
            <a
              className="ml-2"
              onClick={() => {
                dismissToast(t.id);
                navigate(`/advice/${t.adviceId}`);
              }}
            >
              助言を見る
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
