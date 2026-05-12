import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import EmailVerifyBanner from './EmailVerifyBanner';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  // Wrap protected children in a viewport-height flex column so the
  // verify-email banner can claim its sliver at the top (auto-hiding when
  // not applicable) without forcing each child page to know it exists.
  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <EmailVerifyBanner />
      <div className="flex-1 min-h-0 overflow-auto flex flex-col">
        {children}
      </div>
    </div>
  );
}
