// Instagram-Live-style chat overlay shown only on phone widths (md:hidden).
// Renders the full message history in a bottom-anchored scrollable column.
// Default view shows roughly the last 6 messages (capped by max-height);
// the user can scroll up to read older history. Last 6 messages fade with
// per-message opacity caps for the IG-Live aesthetic; older messages
// (revealed by scrolling) render fully opaque.
//
// The input bar is rendered separately in VideoCallView so it can sit
// inline under the user's panel.
import { useState } from 'react';

// Indexed from the bottom — OPACITY_CAPS[0] is the newest message.
const OPACITY_CAPS = [0.95, 0.78, 0.6, 0.42, 0.26, 0.14];

// One pill = one message. Owns its own `expanded` state so tapping toggles
// between the clamped 2-line preview and the full text without forcing the
// parent to track a set of expanded ids.
function ChatPill({ msg, peerLabel, opacity }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse message' : 'Expand message'}
      className="bg-black/55 backdrop-blur-md rounded-2xl px-3 py-1 max-w-full flex-shrink-0 text-left cursor-pointer"
      style={{ opacity }}
    >
      <p className={`text-[13px] leading-snug [overflow-wrap:anywhere] text-left m-0 ${expanded ? '' : 'line-clamp-2'}`}>
        <span className={`font-bold mr-1.5 ${msg.mine ? 'text-primary' : 'text-secondary'}`}>
          {msg.mine ? 'You' : peerLabel}
        </span>
        <span className="text-white">{msg.message}</span>
      </p>
    </button>
  );
}

export default function MobileLiveChat({ messages, peerLabel }) {
  // Newest first so flex-col-reverse can pin it to the visual bottom and
  // grow upwards as more messages arrive. ALL messages are rendered so
  // older history is reachable by scrolling up; the cap on visible count
  // is enforced via max-height + overflow.
  const reversed = [...messages].reverse();

  return (
    // Outer wrapper stays pointer-events-none so taps fall through to the
    // video below; only the inner scrollable column captures touches.
    <div className="md:hidden absolute right-0 bottom-0 z-20 max-w-[50%] pointer-events-none">
      <div
        className="flex flex-col-reverse items-end px-3 pb-3 gap-1.5 overflow-y-auto no-scrollbar pointer-events-auto"
        style={{
          maxHeight: '220px',
          maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
        }}
      >
        {reversed.map((msg, i) => {
          // i = 0 is the newest. First 6 step down via OPACITY_CAPS so the
          // freshest chat reads like IG-Live; older messages stay fully
          // opaque so they're legible once the user scrolls up.
          const cap = i < OPACITY_CAPS.length ? OPACITY_CAPS[i] : 1;
          return (
            <ChatPill
              key={`${msg.timestamp ?? ''}-${messages.length - i}`}
              msg={msg}
              peerLabel={peerLabel}
              opacity={cap}
            />
          );
        })}
      </div>
    </div>
  );
}
