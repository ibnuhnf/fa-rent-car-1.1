import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './lib/cx';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'tinted'
  | 'destructive'
  | 'whatsapp';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  children: ReactNode;
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  children: ReactNode;
}

// antislop §6.1: 5 state wajib (default, hover, active, focus-visible, disabled).
// Active memakai brightness, bukan hex literal (ban #4/#6).
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-surface-lowest hover:bg-primary-container active:brightness-90 focus-visible:ring-primary',
  secondary:
    'bg-secondary text-surface-lowest shadow-action hover:bg-secondary-container active:brightness-90 focus-visible:ring-secondary',
  outline:
    'border border-surface-highest bg-surface-lowest text-on-surface hover:bg-surface-low active:bg-surface focus-visible:ring-secondary',
  tinted:
    'bg-secondary-fixed text-on-secondary-fixed-variant hover:brightness-95 active:brightness-90 focus-visible:ring-secondary',
  destructive:
    'bg-error-container text-on-error-container hover:brightness-95 active:brightness-90 focus-visible:ring-error',
  whatsapp:
    'bg-whatsapp text-surface-lowest hover:brightness-105 active:brightness-95 focus-visible:ring-whatsapp',
};

// antislop §2.2: asymmetric padding — horizontal 1.25x–1.5x vertical.
// antislop §2.1: minimum touch target 44x44px (size md & lg).
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-1.5 text-xs',
  md: 'min-h-11 px-5 py-2 text-sm',
  lg: 'min-h-[3.25rem] px-7 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'start',
    loading = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 'sm' : 'md';
  const renderedIcon = icon ? <Icon name={icon} size={iconSize} /> : null;

  return (
    <button
      {...props}
      ref={ref}
      aria-busy={loading || undefined}
      className={cx(
        // antislop §6.1: hover + active scale + focus-visible + disabled
        'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={isDisabled}
      type={type}
    >
      {loading ? (
        <Icon
          className="animate-spin motion-reduce:animate-none"
          name="progress_activity"
          size={iconSize}
        />
      ) : null}
      {!loading && iconPosition === 'start' ? renderedIcon : null}
      <span>{children}</span>
      {!loading && iconPosition === 'end' ? renderedIcon : null}
    </button>
  );
});

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', icon, iconPosition = 'start', className, children, ...props },
  ref,
) {
  const iconSize = size === 'sm' ? 'sm' : 'md';
  const renderedIcon = icon ? <Icon name={icon} size={iconSize} /> : null;

  return (
    <a
      {...props}
      ref={ref}
      className={cx(
        // antislop §6.1: hover + active scale + focus-visible
        'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {iconPosition === 'start' ? renderedIcon : null}
      <span>{children}</span>
      {iconPosition === 'end' ? renderedIcon : null}
    </a>
  );
});
