import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProfileList from './pages/ProfileList';
import ProfileForm from './pages/ProfileForm';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ProfileList />} />
        <Route path="/new" element={<ProfileForm />} />
        <Route path="/edit/:id" element={<ProfileForm />} />
      </Route>
    </Routes>
  );
}
