// Instagram-Live-style chat overlay shown only on phone widths (md:hidden).
// Last 6 messages fade up the right edge of the video stage: newest at
// ~95% opacity, each older one stepped down. Each message is wrapped in
// its own dark pill so it stays readable against the video underneath
// and doesn't bleed into the panel's "You / Local Feed" label.

const VISIBLE_COUNT = 6;
// Indexed from the bottom — OPACITY_CAPS[0] is the newest message.
const OPACITY_CAPS = [0.95, 0.78, 0.6, 0.42, 0.26, 0.14];

export default function MobileLiveChat({ messages, peerLabel }) {
  // Newest first so flex-col-reverse can pin it to the visual bottom and
  // grow upwards as more messages arrive.
  const recent = messages.slice(-VISIBLE_COUNT).reverse();

  return (
    <div
      className="md:hidden absolute right-0 bottom-0 z-20 max-w-[75%] flex flex-col-reverse items-end px-3 pb-3 gap-1.5 pointer-events-none overflow-hidden"
      style={{
        maxHeight: '50vh',
        maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
      }}
    >
      {recent.map((msg, i) => {
        // i = 0 is the newest (rendered first → appears at bottom thanks
        // to column-reverse). Walk OPACITY_CAPS forward from there.
        const cap = OPACITY_CAPS[i] ?? 0;
        return (
          <div
            key={`${msg.timestamp ?? ''}-${messages.length - i}`}
            className="bg-black/55 backdrop-blur-md rounded-full px-3 py-1 max-w-full text-[13px] leading-snug break-words [overflow-wrap:anywhere] text-left"
            style={{ opacity: cap }}
          >
            <span className={`font-bold mr-1.5 ${msg.mine ? 'text-primary' : 'text-secondary'}`}>
              {msg.mine ? 'You' : peerLabel}
            </span>
            <span className="text-white">{msg.message}</span>
          </div>
        );
      })}
    </div>
  );
}
