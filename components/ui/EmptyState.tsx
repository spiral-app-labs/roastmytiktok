import React from 'react';
import { GradientButton } from './GradientButton';

interface EmptyStateCTAProps {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: EmptyStateCTAProps;
  className?: string;
}

export function EmptyState({ icon, title, description, cta, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-20 px-6 ${className}`}>
      {icon && (
        <div className="text-7xl mb-5">{icon}</div>
      )}
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      {description && (
        <p className="text-zinc-500 max-w-xs mx-auto mb-8">{description}</p>
      )}
      {cta && (
        cta.href ? (
          <a href={cta.href}>
            <GradientButton variant="primary" size="lg">
              {cta.icon && <span>{cta.icon}</span>}
              {cta.label}
            </GradientButton>
          </a>
        ) : (
          <GradientButton variant="primary" size="lg" onClick={cta.onClick}>
            {cta.icon && <span>{cta.icon}</span>}
            {cta.label}
          </GradientButton>
        )
      )}
    </div>
  );
}
