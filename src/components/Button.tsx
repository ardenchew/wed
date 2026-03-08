import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'solid' | 'ghost' | 'outlineSerif' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'solid',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const classNames = ['ui-button', `ui-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classNames} {...props} />;
}
