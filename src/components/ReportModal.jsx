import { useState } from 'react';
import ModalBase from './ModalBase';
import api from '../api/axios';
import { GRADIENT } from '../constants/theme';

const REASONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'nudity', label: 'Nudity / sexual content' },
  { value: 'harassment', label: 'Harassment or hate speech' },
  { value: 'underage', label: 'Appears to be a minor' },
  { value: 'illegal_content', label: 'Illegal content' },
  { value: 'other', label: 'Other' },
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
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,110,132,0.15)' }}>
            <span className="material-symbols-outlined text-error" aria-hidden="true">flag</span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">Report Stranger</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-high hover:bg-surface-bright transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">close</span>
        </button>
      </header>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        <p className="text-sm text-on-surface-variant">
          Reports are reviewed by our safety team. Choose the reason that best applies.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-xs font-label font-bold text-on-surface-variant tracking-wide uppercase mb-2">Reason</legend>
          {REASONS.map((r) => (
            <label
              key={r.value}
              className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
              style={{
                background: reason === r.value ? 'rgba(186,158,255,0.1)' : 'transparent',
                border: `1px solid ${reason === r.value ? 'rgba(186,158,255,0.3)' : 'rgba(72,72,71,0.3)'}`,
              }}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-primary"
              />
              <span className="text-sm text-on-surface">{r.label}</span>
            </label>
          ))}
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
            className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-secondary/30 resize-none"
          />
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-bright transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason}
            className="flex-1 px-6 py-3 rounded-full text-black font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundImage: GRADIENT }}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
