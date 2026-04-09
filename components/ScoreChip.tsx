'use client';

type Size = 'sm' | 'md';

interface ScoreChipProps {
  score: number;
  size?: Size;
  showGrade?: boolean;
  className?: string;
}

function scoreToGrade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 87) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 73) return 'B';
  if (score >= 65) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}

function scoreToTone(score: number): {
  bg: string;
  border: string;
  text: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-400/40',
      text: 'text-emerald-300',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-amber-500/15',
      border: 'border-amber-400/40',
      text: 'text-amber-300',
    };
  }
  return {
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/40',
    text: 'text-rose-300',
  };
}

const sizeClasses: Record<Size, { wrap: string; num: string; grade: string }> = {
  sm: {
    wrap: 'px-2 py-0.5 gap-1',
    num: 'text-sm',
    grade: 'text-[9px]',
  },
  md: {
    wrap: 'px-2.5 py-1 gap-1.5',
    num: 'text-base',
    grade: 'text-[10px]',
  },
};

export default function ScoreChip({
  score,
  size = 'md',
  showGrade = false,
  className = '',
}: ScoreChipProps) {
  const tone = scoreToTone(score);
  const sz = sizeClasses[size];
  const grade = scoreToGrade(score);
  const rounded = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border backdrop-blur-md',
        'font-mono tabular-nums font-semibold',
        tone.bg,
        tone.border,
        tone.text,
        sz.wrap,
        className,
      ].join(' ')}
    >
      <span className={sz.num}>{rounded}</span>
      {showGrade && (
        <span
          className={[
            sz.grade,
            'font-semibold uppercase tracking-wider opacity-80',
          ].join(' ')}
        >
          {grade}
        </span>
      )}
    </span>
  );
}

export { scoreToGrade, scoreToTone };
