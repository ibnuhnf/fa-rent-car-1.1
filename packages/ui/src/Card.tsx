import { type HTMLAttributes } from 'react';

import { cx } from './lib/cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  tone?: 'default' | 'info' | 'warning';
}

/**
 * antislop ban #12 — jangan tumpuk border + shadow + background sekaligus.
 *   default: bg + shadow, tanpa border (elevasi tonal)
 *   info/warning: bg + hairline border, tanpa shadow
 *   interactive: tambah shadow hover sebagai umpan balik
 */
const toneClasses = {
  default: 'bg-surface-lowest shadow-card',
  info: 'border border-secondary-fixed bg-secondary-fixed',
  warning: 'border border-warning-container bg-warning-container',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

export function Card({
  padding = 'md',
  interactive = false,
  tone = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-card',
        toneClasses[tone],
        interactive &&
          'transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none',
        paddingClasses[padding],
        className,
      )}
    />
  );
}
