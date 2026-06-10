import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages はリポジトリ名のサブパス配下で配信されるため base を合わせる。
// 開発時 (vite dev) は '/' でよい。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/sales-hub/' : '/',
  plugins: [react(), tailwindcss()],
}));
