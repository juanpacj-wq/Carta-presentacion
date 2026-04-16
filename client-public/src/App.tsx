import { Routes, Route } from 'react-router-dom';
import ProfileCard from './pages/ProfileCard';

function NotFound() {
  return (
    <div style={{
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
      <div>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Perfil no encontrado</p>
      </div>
    </div>
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
