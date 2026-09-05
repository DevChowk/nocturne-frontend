import { useState } from 'react';
import ModalBase from './ModalBase';
import api from '../api/axios';

const REASONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'nudity',              label: 'Nudity / sexual content' },
  { value: 'harassment',          label: 'Harassment or hate speech' },
  { value: 'underage',            label: 'Appears to be a minor' },
];

export default function ReportModal({ onClose, reportedUserId, roomId, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { setError('Please select a reason.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/reports', { reportedUserId, roomId, reason, details });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBase maxWidth="max-w-lg" onClose={onClose}>
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tertiary text-white">
            <span className="material-symbols-outlined" aria-hidden="true">flag</span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">What happened?</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">close</span>
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-6 space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase mb-2">Reason</legend>
          {/* Solid-fill radio rows per Design Book Report spec — selected row
              flips to yellow with black text + hard drop shadow (same
              vocabulary as the sticker CTA). Unselected wears a surface
              background with a 2px stroke so both states share the same
              structural weight and the flip reads as a clear commit. */}
          {REASONS.map((r) => {
            const active = reason === r.value;
            return (
              <label
                key={r.value}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-transform active:scale-[0.99]"
                style={{
                  background: active
                    ? 'rgb(var(--color-primary-rgb))'
                    : 'rgb(var(--color-surface-high-rgb))',
                  color: active ? '#14000A' : 'rgb(var(--color-on-surface-rgb))',
                  border: '2px solid rgb(var(--color-stroke-rgb))',
                  borderRadius: 12,
                  boxShadow: active ? '4px 4px 0 rgb(var(--color-stroke-rgb))' : 'none',
                  transform: active ? 'translate(-2px, -2px)' : 'none',
                }}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={active}
                  onChange={() => setReason(r.value)}
                  className="sr-only"
                />
                {/* Custom-drawn dot so the native radio's ugly default doesn't
                    break the sticker vocabulary. */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `2px solid ${active ? '#14000A' : 'rgb(var(--color-outline-rgb))'}`,
                    background: active ? '#14000A' : 'transparent',
                  }}
                >
                  {active && (
                    <span
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--color-primary-rgb))' }}
                    />
                  )}
                </span>
                <span className="text-sm font-semibold">{r.label}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase" htmlFor="report-details">
            Additional details <span className="text-on-surface-variant/60 normal-case">(optional)</span>
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything specific we should know?"
            className="w-full field-sticker p-3 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 resize-none"
          />
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-sticker-outline flex-1 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason}
            className="btn-sticker flex-1 text-sm disabled:opacity-50"
            style={{ background: 'rgb(var(--color-tertiary-rgb))', color: '#FFFFFF' }}
          >
            {submitting ? 'Submitting…' : 'Report & skip'}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
