// Sticker meme-core primary. Kept as a two-stop gradient (barely
// perceptible variation) so every existing `backgroundImage: GRADIENT`
// callsite renders as a flat yolk-yellow fill without needing to
// touch each callsite. gradientTextStyle inherits, so any headline
// using it now reads yellow instead of purple.
export const GRADIENT = 'linear-gradient(135deg, #FFD400 0%, #F5B700 100%)';

export const gradientTextStyle = {
  backgroundImage: GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// Sticker-specific tokens re-exported so JSX callsites that need the
// signature look can compose it without hand-copying rgb values.
export const STICKER_STROKE = 'rgb(var(--color-stroke-rgb))';
export const STICKER_SHADOW = '4px 4px 0 rgb(var(--color-stroke-rgb))';
export const STICKER_SHADOW_SM = '2px 2px 0 rgb(var(--color-stroke-rgb))';
