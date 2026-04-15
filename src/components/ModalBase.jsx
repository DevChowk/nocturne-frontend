export default function ModalBase({ children, maxWidth = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div
        className={`relative w-full ${maxWidth} flex flex-col bg-surface-container-low rounded-xl border border-white/5 overflow-hidden max-h-[90vh]`}
        style={{ boxShadow: '0 0 40px rgba(132,85,239,0.15)' }}
      >
        {children}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"
          style={{ background: 'rgba(186,158,255,0.05)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"
          style={{ background: 'rgba(0,207,252,0.05)' }}
        />
      </div>
    </div>
  );
}
