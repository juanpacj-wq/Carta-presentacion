import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProfileCard from './pages/ProfileCard';

function NotFound() {
  useEffect(() => {
    document.title = 'Pagina no encontrada - GECELCA';
  }, []);

  return (
    <main style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100dvh',
      background: '#023f86',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div role="alert" aria-live="assertive">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>
          Pagina no encontrada
        </h1>
        <p style={{ fontSize: '1rem' }}>
          El perfil solicitado no existe o fue removido.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/profile/:id" element={<ProfileCard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
