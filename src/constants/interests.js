// Curated interest tags. The backend allowlist (in routes/auth.js) MUST
// stay in sync with the codes below — drift just means PATCH /me will
// 400 on the new code, which is recoverable but ugly. Add codes to both
// sides when introducing new interests.

export const INTERESTS = [
  { code: 'music',             label: 'Music',             icon: 'music_note' },
  { code: 'gaming',            label: 'Gaming',            icon: 'sports_esports' },
  { code: 'movies',            label: 'Movies',            icon: 'movie' },
  { code: 'anime',             label: 'Anime',             icon: 'animation' },
  { code: 'books',             label: 'Books',             icon: 'menu_book' },
  { code: 'sports',            label: 'Sports',            icon: 'sports_basketball' },
  { code: 'fitness',           label: 'Fitness',           icon: 'fitness_center' },
  { code: 'travel',            label: 'Travel',            icon: 'flight' },
  { code: 'cooking',           label: 'Cooking',           icon: 'restaurant' },
  { code: 'art',               label: 'Art',               icon: 'palette' },
  { code: 'photography',       label: 'Photography',       icon: 'photo_camera' },
  { code: 'tech',              label: 'Tech',              icon: 'memory' },
  { code: 'coding',            label: 'Coding',            icon: 'code' },
  { code: 'science',           label: 'Science',           icon: 'science' },
  { code: 'philosophy',        label: 'Philosophy',        icon: 'lightbulb' },
  { code: 'language_exchange', label: 'Language exchange', icon: 'translate' },
  { code: 'study',             label: 'Study',             icon: 'school' },
  { code: 'pets',              label: 'Pets',              icon: 'pets' },
  { code: 'nature',            label: 'Nature',            icon: 'park' },
  { code: 'fashion',           label: 'Fashion',           icon: 'styler' },
  { code: 'meditation',        label: 'Meditation',        icon: 'self_improvement' },
  { code: 'writing',           label: 'Writing',           icon: 'edit_note' },
  { code: 'dance',             label: 'Dance',             icon: 'celebration' },
  { code: 'memes',             label: 'Memes',             icon: 'mood' },
  { code: 'cars',              label: 'Cars',              icon: 'directions_car' },
  { code: 'design',            label: 'Design',            icon: 'design_services' },
  { code: 'gardening',         label: 'Gardening',         icon: 'yard' },
  { code: 'comedy',            label: 'Comedy',            icon: 'theater_comedy' },
  { code: 'finance',           label: 'Finance',           icon: 'attach_money' },
  { code: 'crypto',            label: 'Crypto',            icon: 'currency_bitcoin' },
];

export const MAX_INTERESTS = 5;

const byCode = new Map(INTERESTS.map((i) => [i.code, i]));

export const interestByCode = (code) => byCode.get(code) || null;
