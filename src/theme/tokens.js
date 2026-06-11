// Design tokens. `T` is the live token object the whole app reads from.
// `applyTheme(settings)` mutates it from the active theme + user overrides —
// it runs at the top of <App> on every render, so a settings change repaints
// everything. To add a theme, append to THEMES; to add swatch choices, append
// to BG_OPTIONS / ACCENT_OPTIONS.

export const PILLAR_COLORS = {
  deepwork:    '#7C6F8E',
  movement:    '#7A8C7E',
  routine:     '#9CA398',
  nourishment: '#B8893E',
  reading:     '#C4956A',
  reflection:  '#8C8597',
  coffee:      '#5C3A1F',
};

export const THEMES = [
  {
    id: 'parchment',
    label: 'Parchment',
    bg: '#E8E0D4',
    card: '#FFFFFF',
    cardCream: '#FFF8F0',
    ink: '#2C2418',
    muted: '#A89880',
    border: '#EAE0D4',
    accent: '#C4956A',
  },
  // Add new themes here, e.g.:
  // { id: 'night', label: 'Night', bg: '#1A1410', card: '#2C2418', ... },
];

export const BG_OPTIONS     = ['#E8E0D4', '#F0E9DE', '#EDE3D2', '#DFE4DC', '#E4DEE8'];
export const ACCENT_OPTIONS = ['#C4956A', '#7A8C7E', '#7C6F8E', '#B8893E', '#5C3A1F', '#8C8597'];

const base = THEMES[0];

export const T = {
  bg: base.bg,
  card: base.card,
  cardCream: base.cardCream,
  ink: base.ink,
  muted: base.muted,
  border: base.border,
  amber: base.accent, // the live accent — historically named "amber"
  pillars: PILLAR_COLORS,
  fontSerif: '"Lora", Georgia, serif',
  fontSans:  '"DM Sans", system-ui, sans-serif',
};

export function applyTheme(settings = {}) {
  const theme = THEMES.find(t => t.id === settings.theme) || THEMES[0];
  T.bg = settings.bgColor || theme.bg;
  T.card = theme.card;
  T.cardCream = theme.cardCream;
  T.ink = theme.ink;
  T.muted = theme.muted;
  T.border = theme.border;
  T.amber = settings.accentColor || theme.accent;
}
