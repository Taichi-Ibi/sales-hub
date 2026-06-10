import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* GitHub Pages のサブパス直リンクで404にならないよう HashRouter を使う（§13） */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
