import React from 'react';
import { glassCard } from '@/lib/design-tokens';

type GlassCardVariant = 'default' | 'highlighted' | 'interactive' | 'surface';

interface GlassCardProps {
  variant?: GlassCardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function GlassCard({
  variant = 'surface',
  className = '',
  children,
  onClick,
}: GlassCardProps) {
  const base = glassCard[variant];

  return (
    <div
      className={`${base} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
