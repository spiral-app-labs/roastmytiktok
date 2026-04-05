// Design Tokens — single source of truth for Go Viral UI
// No hardcoded values in components; import from here.

export const colors = {
  brand: {
    orange: '#fb923c',
    pink: '#ec4899',
    orangeDark: '#f97316',
    pinkDark: '#db2777',
  },
  surface: {
    base: '#080808',
    card: 'rgba(24,24,27,0.6)',    // zinc-900/60
    cardHover: 'rgba(24,24,27,0.8)',
    border: 'rgba(39,39,42,0.5)',   // zinc-800/50
    borderHover: 'rgba(249,115,22,0.25)', // orange-500/25
  },
  score: {
    green: {
      text: '#86efac',   // green-300
      bg: 'rgba(34,197,94,0.15)',
      ring: 'rgba(34,197,94,0.3)',
    },
    yellow: {
      text: '#fde047',   // yellow-300
      bg: 'rgba(234,179,8,0.15)',
      ring: 'rgba(234,179,8,0.3)',
    },
    red: {
      text: '#fca5a5',   // red-300
      bg: 'rgba(239,68,68,0.15)',
      ring: 'rgba(239,68,68,0.3)',
    },
  },
} as const;

export const gradients = {
  primary: 'from-orange-500 to-pink-500',
  primaryBg: 'bg-gradient-to-r from-orange-500 to-pink-500',
  heroTopLeft: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,146,60,0.12), transparent)',
  heroBottomRight: 'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.08), transparent)',
  subtleGlow: 'from-orange-500/5 to-pink-500/5',
} as const;

export const borderRadius = {
  card: 'rounded-2xl',
  button: 'rounded-xl',
  pill: 'rounded-full',
  badge: 'rounded-lg',
  sm: 'rounded-lg',
  xs: 'rounded-md',
} as const;

export const backdropBlur = {
  card: 'backdrop-blur-xl',
  sm: 'backdrop-blur-sm',
} as const;

export const shadows = {
  card: 'shadow-2xl shadow-black/50',
  button: 'shadow-lg shadow-orange-500/25',
  buttonHover: 'hover:shadow-orange-500/40',
} as const;

export const spacing = {
  pagePadding: 'px-4',
  sectionGap: 'space-y-8',
  cardPadding: 'p-5',
  cardPaddingLg: 'p-8',
} as const;

// Tailwind class strings for reuse
export const glassCard = {
  default: 'bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl',
  surface: 'bg-zinc-900/60 border border-zinc-800/50 backdrop-blur-sm rounded-2xl',
  highlighted: 'bg-zinc-900/80 border border-orange-500/25 backdrop-blur-xl rounded-2xl',
  interactive: 'bg-zinc-900/60 border border-zinc-800/50 backdrop-blur-sm rounded-2xl hover:border-orange-500/25 hover:bg-zinc-900/80 transition-all duration-200',
} as const;

export const button = {
  primary: 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40',
  secondary: 'bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  sizes: {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-8 py-3.5 text-sm rounded-xl',
  },
} as const;
