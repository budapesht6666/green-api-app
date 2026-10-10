import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const TelegramLogo = (props: IconProps) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
    <circle cx="32" cy="32" r="32" fill="#2aabee" />
    <path
      fill="#fff"
      d="M14 31.6l31.6-12.2c1.5-.5 2.7.4 2.2 2.6l-5.4 25.3c-.4 1.8-1.5 2.2-3 1.4l-8.2-6-4 3.8c-.4.4-.8.8-1.6.8l.6-8.4 15.2-13.7c.7-.6-.1-.9-1-.3L22.6 38.4l-8.1-2.5c-1.8-.5-1.8-1.7.4-2.6z"
    />
  </svg>
);

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const SendIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M2.5 20.5l19-8.5-19-8.5v6.6l13.6 1.9-13.6 1.9z" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path {...stroke} d="M12 5v14M5 12h14" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path {...stroke} d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />
  </svg>
);

export const BackIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path {...stroke} d="M15 5l-7 7 7 7" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 12" aria-hidden="true" {...props}>
    <path {...stroke} strokeWidth={1.6} d="M2 6.5l3 3L13 1.5" />
  </svg>
);

export const DoubleCheckIcon = (props: IconProps) => (
  <svg viewBox="0 0 20 12" aria-hidden="true" {...props}>
    <path {...stroke} strokeWidth={1.6} d="M1 6.5l3 3L12 1.5M8 8.5l1 1L17 1.5" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
    <circle cx="8" cy="8" r="6" {...stroke} strokeWidth={1.4} />
    <path {...stroke} strokeWidth={1.4} d="M8 4.5V8l2.2 1.4" />
  </svg>
);
