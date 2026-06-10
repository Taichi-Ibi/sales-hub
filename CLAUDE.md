# Sales Hub

## パッケージマネージャー

**bun** を使用する。`npm` や `pnpm` は使わない。

```bash
bun install
bun run dev
bun run build
bun run check
```

## ワークフロー

- タスクは.kiro/specs/ai-sales-brain/tasks.mdを確認のこと
- 進行中のタスクは[-]、完了タスクは[x]とマークすること
- 各タスク完了後に、agent-browserでE2Eテストすること
