import ModalBase from './ModalBase';
import { GRADIENT } from '../constants/theme';

export default function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <ModalBase maxWidth="max-w-sm" onClose={onCancel}>
      <div className="px-6 pt-8 pb-6 text-center">
        <div className="mx-auto mb-5 flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: 'rgba(255,79,79,0.15)', color: '#FF4F4F' }}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 32 }}>logout</span>
        </div>
        <h2 className="font-headline font-bold text-on-surface text-xl mb-2">Log out?</h2>
        <p className="text-on-surface-variant text-sm">
          You'll need to sign back in to continue chatting.
        </p>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1btn-sticker-outline text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-sticker flex-1 px-5 text-sm"
        >
          Log out
        </button>
      </div>
    </ModalBase>
  );
}
