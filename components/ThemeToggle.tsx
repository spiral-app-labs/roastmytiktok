'use client';

import { LaptopMinimal, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white/70 p-1 dark:border-white/8 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Switch to light mode"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'light'
            ? 'bg-zinc-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] dark:bg-white dark:text-zinc-950'
            : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        <SunMedium className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-label="Use browser theme"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'system'
            ? 'bg-zinc-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] dark:bg-white dark:text-zinc-950'
            : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        <LaptopMinimal className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Switch to dark mode"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          theme === 'dark'
            ? 'bg-zinc-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] dark:bg-white dark:text-zinc-950'
            : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>
      <span className="sr-only">
        Current theme: {theme === 'system' ? `system (${resolvedTheme})` : theme}
      </span>
    </div>
  );
}
