import { useState } from 'react';
import ModalBase from './ModalBase';
import { GRADIENT } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { USERNAME_REGEX, DISPLAY_NAME_MAX, BIO_MAX } from '../constants/policy';
import {
  LANGUAGE_CODES,
  COUNTRY_CODES,
  languageName,
  countryName,
  countryFlag,
  MAX_LANGUAGES,
} from '../constants/locale';
import { INTERESTS, MAX_INTERESTS } from '../constants/interests';
import SearchableSelect from './SearchableSelect';

const sortedLanguages = LANGUAGE_CODES
  .map((code) => ({ code, name: languageName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const sortedCountries = COUNTRY_CODES
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function ProfileEditModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || '');
  const [languages, setLanguages] = useState(Array.isArray(user?.languages) ? user.languages : []);
  const [interests, setInterests] = useState(Array.isArray(user?.interests) ? user.interests : []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = (code) => {
    setLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((l) => l !== code)
        : prev.length >= MAX_LANGUAGES ? prev : [...prev, code]
    );
  };

  const toggleInterest = (code) => {
    setInterests((prev) =>
      prev.includes(code)
        ? prev.filter((i) => i !== code)
        : prev.length >= MAX_INTERESTS ? prev : [...prev, code]
    );
  };

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
      await updateProfile({ username, displayName, bio, country: country || '', languages, interests });
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
            placeholder="Alex Rivera"
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

        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="pe-country">
            Country <span className="text-on-surface-variant/60 normal-case">(optional)</span>
          </label>
          <SearchableSelect
            id="pe-country"
            value={country}
            onChange={setCountry}
            options={sortedCountries}
            placeholder="Search countries…"
            formatOption={(c) => `${countryFlag(c.code)}  ${c.name}`}
            emptyLabel="Not set"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase">
              Languages <span className="text-on-surface-variant/60 normal-case">(used for matching)</span>
            </span>
            <span className="text-[10px] text-on-surface-variant">{languages.length}/{MAX_LANGUAGES}</span>
          </div>
          <p className="text-xs text-on-surface-variant">Pick what you'd like to chat in. We'll prefer matches who share at least one.</p>
          <div className="flex flex-wrap gap-2">
            {sortedLanguages.map((l) => {
              const selected = languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLanguage(l.code)}
                  aria-pressed={selected}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95"
                  style={selected
                    ? { background: 'rgba(186,158,255,0.18)', borderColor: 'rgba(186,158,255,0.45)', color: '#ba9eff' }
                    : { background: 'rgba(38,38,38,0.6)', borderColor: 'rgba(72,72,71,0.4)', color: '#adaaaa' }}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase">
              Interests <span className="text-on-surface-variant/60 normal-case">(softly preferred in matches)</span>
            </span>
            <span className="text-[10px] text-on-surface-variant">{interests.length}/{MAX_INTERESTS}</span>
          </div>
          <p className="text-xs text-on-surface-variant">Pick a few. We'll prefer matches who share at least one — and fall back to anyone after 10s.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((it) => {
              const selected = interests.includes(it.code);
              return (
                <button
                  key={it.code}
                  type="button"
                  onClick={() => toggleInterest(it.code)}
                  aria-pressed={selected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95"
                  style={selected
                    ? { background: 'rgba(0,207,252,0.16)', borderColor: 'rgba(0,207,252,0.45)', color: '#00cffc' }
                    : { background: 'rgba(38,38,38,0.6)', borderColor: 'rgba(72,72,71,0.4)', color: '#adaaaa' }}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">{it.icon}</span>
                  {it.label}
                </button>
              );
            })}
          </div>
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
