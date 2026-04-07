// Design Tokens - single source of truth for Go Viral UI
// No hardcoded values in components; import from here.

export const colors = {
  brand: {
    orange: '#fb923c',
    pink: '#ec4899',
    orangeDark: '#f97316',
    pinkDark: '#db2777',
  },
  surface: {
    base: '#09090b',
    card: '#18181b',
    cardHover: '#1f1f23',
    border: '#27272a',
    borderHover: '#3f3f46',
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
  status: {
    working: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      text: 'text-emerald-400',
      emoji: '✅',
    },
    needsWork: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/25',
      text: 'text-red-400',
      emoji: '🔴',
    },
    unavailable: {
      bg: 'bg-zinc-800/40',
      border: 'border-zinc-700/40',
      text: 'text-zinc-500',
      emoji: '⚪',
    },
    quickWin: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/25',
      text: 'text-orange-400',
      emoji: '⚡',
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
  card: 'rounded-lg',
  button: 'rounded-lg',
  pill: 'rounded-full',
  badge: 'rounded-md',
  sm: 'rounded-md',
  xs: 'rounded',
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
  default: 'bg-[#18181b] border border-zinc-800 rounded-lg',
  surface: 'bg-[#18181b] border border-zinc-800 rounded-lg',
  highlighted: 'bg-[#18181b] border border-orange-500/20 rounded-lg',
  interactive: 'bg-[#18181b] border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-[#1f1f23] transition-all duration-200',
} as const;

export const button = {
  primary: 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/15',
  secondary: 'bg-[#18181b] text-zinc-200 font-medium border border-zinc-800 hover:border-zinc-700 hover:bg-[#1f1f23] transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  sizes: {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-sm rounded-lg',
  },
} as const;
