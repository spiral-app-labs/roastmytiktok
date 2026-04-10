import type { SVGProps } from 'react';

export default function GoViralMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20.95 9.95a8.8 8.8 0 0 0-6.9-1.78"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M9.26 13.14a8.8 8.8 0 0 0 1.86 13.66"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M17.79 25.95a8.8 8.8 0 0 0 8.84-8.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="24.7" cy="10.2" r="2.9" fill="currentColor" />
      <circle cx="8.6" cy="16.1" r="2.9" fill="currentColor" />
      <circle cx="16.3" cy="25.7" r="2.9" fill="currentColor" />
      <circle
        cx="16"
        cy="16"
        r="5.7"
        stroke="currentColor"
        strokeWidth="3.2"
      />
    </svg>
  );
}
