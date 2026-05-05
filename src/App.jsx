import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthProvider';
import { SettingsProvider } from './context/SettingsProvider';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/Home';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
