import type { WikiSnapshot } from '../data/snapshots';
import { snapshotsOf } from '../data/snapshots';
import type { SnapshotPatch } from '../store/StoreContext';

/**
 * 当日スナップショットに実行時パッチ（取込による追記・ヨミ変化）を適用して返す。
 * 追記行は「現在の状況」セクションの末尾に入り、highlightLines で強調できる。
 */
export function applySnapshotPatch(
  snapshot: WikiSnapshot,
  patch: SnapshotPatch | undefined,
): { snapshot: WikiSnapshot; addedLines: ReadonlySet<string> } {
  if (!patch) return { snapshot, addedLines: new Set() };
  const meta = { ...snapshot.meta, ...patch.meta, updated_at: '2026-06-10 10:00' };
  let markdown = snapshot.markdown;
  if (patch.addedLines.length > 0) {
    const lines = markdown.split('\n');
    const head = lines.findIndex((l) => l.startsWith('## 現在の状況'));
    if (head >= 0) {
      // 「現在の状況」の箇条書きの末尾位置を探して追記する。
      let end = head + 1;
      while (end < lines.length && (lines[end].startsWith('- ') || lines[end].trim() === '')) {
        if (lines[end].trim() === '' && lines[end + 1]?.startsWith('##')) break;
        end++;
      }
      while (end > head + 1 && lines[end - 1].trim() === '') end--;
      lines.splice(end, 0, ...patch.addedLines.map((l) => `- ${l}`));
      markdown = lines.join('\n');
    } else {
      markdown += `\n${patch.addedLines.map((l) => `- ${l}`).join('\n')}`;
    }
  }
  return { snapshot: { ...snapshot, meta, markdown }, addedLines: new Set(patch.addedLines) };
}

/** 指定案件の（パッチ適用済み）当日・前日スナップショットを返す。 */
export function dealSnapshots(
  dealId: string,
  patches: Record<string, SnapshotPatch>,
): { yesterday: WikiSnapshot | undefined; today: WikiSnapshot | undefined; addedLines: ReadonlySet<string> } {
  const list = snapshotsOf(dealId);
  const yesterday = list[list.length - 2];
  const base = list[list.length - 1];
  if (!base) return { yesterday, today: undefined, addedLines: new Set() };
  const { snapshot: today, addedLines } = applySnapshotPatch(base, patches[dealId]);
  return { yesterday, today, addedLines };
}
