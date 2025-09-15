import React from 'react';
import { cn } from '@/utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-[color:var(--primary-600)] text-white hover:bg-[color:var(--primary-700)] focus:ring-[color:var(--primary-600)]',
    secondary: 'bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)] hover:bg-[color:var(--primary-50)] focus:ring-[color:var(--primary-600)]',
    outline: 'border border-[color:var(--border)] bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--primary-50)] focus:ring-[color:var(--primary-600)]',
    ghost: 'text-[color:var(--foreground)] hover:bg-[color:var(--primary-50)] focus:ring-[color:var(--primary-600)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
