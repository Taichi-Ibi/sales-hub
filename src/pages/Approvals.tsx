import { useMemo } from 'react';
import { APPROVAL_STATUSES, useStore } from '../store/StoreContext';
import { ActionCard } from '../components/ActionCard';
import { Button } from '../components/Button';

export function Approvals() {
  const { actions, demoApproveByFS, send } = useStore();

  const list = useMemo(
    () => actions.filter((a) => APPROVAL_STATUSES.includes(a.status)),
    [actions],
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">FS承認待ち</h1>

      {list.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">FS承認待ちの案件はありません</p>
          <p className="mt-1 text-sm text-ink-sub">高リスク案件をFSへ回すとここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              from="/approvals"
              footer={
                a.status === 'FS承認待ち' ? (
                  <Button variant="secondary" onClick={() => demoApproveByFS(a.id)}>
                    （デモ）FSが承認する
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-good">承認済み（送信可能）</span>
                    <Button variant="primary" className="ml-auto" onClick={() => send(a.id)}>
                      送信する
                    </Button>
                  </div>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
