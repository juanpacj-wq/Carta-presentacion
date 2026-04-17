import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AuthGate from './components/AuthGate';
import App from './App';
import './styles/global.css';

// En prod el admin vive bajo /admin/ (Vite `base`), en dev en la raiz.
// `import.meta.env.BASE_URL` refleja ese valor; BrowserRouter rechaza el slash final.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);
