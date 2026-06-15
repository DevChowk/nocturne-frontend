import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVerificationRequired } from '../hooks/useVerification';
import EmailVerifyBanner from './EmailVerifyBanner';
import VerificationGate from './VerificationGate';

export default function ProtectedRoute({ children }) {
  const { token, loading, user } = useAuth();
  const verificationRequired = useVerificationRequired(user);
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;

  // Past the grace deadline and still unverified: replace the whole app with a
  // blocking gate. The backend already refuses the socket + outbound actions
  // for these users, so there's nothing functional to show behind it.
  if (verificationRequired) return <VerificationGate />;

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
