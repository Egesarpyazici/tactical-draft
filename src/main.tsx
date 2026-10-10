import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
const ArcadeApp = React.lazy(() =>
  import('./arcade/ui/ArcadeApp').then((m) => ({ default: m.ArcadeApp })),
);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname.startsWith('/arcade') ? (
      <React.Suspense fallback={<p>Arcade yükleniyor…</p>}>
        <ArcadeApp />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
