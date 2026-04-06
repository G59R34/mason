import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ChatLayout } from './components/ChatLayout';
import { LoginPage } from './components/LoginPage';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ChatLayout />} />
      <Route path="/channel/:channelId" element={<ChatLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
