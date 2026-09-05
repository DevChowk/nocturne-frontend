// Visual vocabulary for the per-match friend button. Shared by the in-call
// control bar and the stranger-panel action button so both read identically.
//
// Solid fills with a soft glow, no border ring. State is signalled by colour
// alone, per the Design Book control law: yellow = actionable, cobalt =
// accepted / connected, coral = needs your answer.
export const FRIEND_STYLE = {
  accepted: { background: 'rgb(var(--color-secondary-rgb))', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(63,82,255,0.25)' },
  sent:     { background: 'rgb(var(--color-primary-rgb))',   color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' },
  received: { background: 'rgb(var(--color-tertiary-rgb))',  color: '#FFFFFF', boxShadow: '0 4px 20px rgba(255,79,79,0.25)' },
  none:     { background: 'rgb(var(--color-primary-rgb))',   color: '#14000A', boxShadow: '0 4px 20px rgba(255,212,0,0.2)' },
};

export const FRIEND_ICON = {
  accepted: 'check_circle',
  sent: 'hourglass_top',
  received: 'person_add_alt',
  none: 'person_add',
};

export const FRIEND_LABEL = {
  accepted: 'Friends',
  sent: 'Friend request sent',
  received: 'Accept friend request',
  none: 'Add friend',
};
