import { useState } from 'react';
import TermsModal from '../components/TermsModal';
import PrivacyModal from '../components/PrivacyModal';

export default function useAuthModals() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const modals = (
    <>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </>
  );

  return {
    openTerms: () => setShowTerms(true),
    openPrivacy: () => setShowPrivacy(true),
    modals,
  };
}
