import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = '← Back',
  className = '',
  actions,
}: PageHeaderProps) {
  return (
    <div className={`mb-10 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-block text-sm text-zinc-500 transition-colors hover:text-sky-400"
        >
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-zinc-400 mt-2 text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
