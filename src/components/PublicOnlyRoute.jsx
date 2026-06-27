import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PublicOnlyRoute({ children }) {
  const { token, loading, isGuest } = useAuth();
  if (loading) return null;
  // Guests are technically holding a token but shouldn't be locked out of
  // landing / login / signup — those routes are how they convert into a
  // registered account. Only block fully-registered users from re-seeing
  // these screens.
  if (token && !isGuest) return <Navigate to="/home" replace />;
  return children;
}
