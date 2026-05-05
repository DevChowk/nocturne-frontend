import { useState } from 'react';
import ModalBase from './ModalBase';
import { GRADIENT } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { USERNAME_REGEX, DISPLAY_NAME_MAX, BIO_MAX } from '../constants/policy';

export default function ProfileEditModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3–20 chars: lowercase letters, digits, _ or .');
      return;
    }
    if (displayName.length > DISPLAY_NAME_MAX) {
      setError(`Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`);
      return;
    }
    if (bio.length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }
    setSubmitting(true);
    try {
      await updateProfile({ username, displayName, bio });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBase maxWidth="max-w-md" onClose={onClose}>
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(186,158,255,0.15)' }}>
            <span className="material-symbols-outlined text-primary" aria-hidden="true">person</span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">Edit profile</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">close</span>
        </button>
      </header>

      <form onSubmit={onSubmit} className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="pe-username">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" aria-hidden="true">@</span>
            <input
              id="pe-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
              required
              className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-9 pr-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="pe-display">
            Display name <span className="text-on-surface-variant/60 normal-case">(optional)</span>
          </label>
          <input
            id="pe-display"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="Alex Nocturne"
            className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="pe-bio">
            Bio <span className="text-on-surface-variant/60 normal-case">(optional)</span>
          </label>
          <textarea
            id="pe-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            placeholder="A line or two about you."
            className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 resize-none"
          />
          <p className="text-xs text-on-surface-variant text-right">{bio.length}/{BIO_MAX}</p>
        </div>

        {error && <p className="text-error text-sm" role="alert">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-bright transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-5 py-3 rounded-full text-black font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundImage: GRADIENT }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
