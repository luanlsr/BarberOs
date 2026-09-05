import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  asChild?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  asChild = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `button button-${variant} ${className}`.trim();
  if (asChild && isElementWithProps(children)) {
    return {
      ...children,
      props: {
        ...children.props,
        className: `${classes} ${children.props.className ?? ''}`.trim(),
      },
    } as never;
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({ label, className = '', children, ...props }: IconButtonProps) {
  return (
    <button
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({
  variant = 'neutral',
  children,
}: {
  variant?: 'success' | 'warning' | 'neutral';
  children: ReactNode;
}) {
  return <span className={`status-badge status-${variant}`}>{children}</span>;
}

function isElementWithProps(value: ReactNode): value is React.ReactElement<{ className?: string }> {
  return typeof value === 'object' && value !== null && 'props' in value;
}
