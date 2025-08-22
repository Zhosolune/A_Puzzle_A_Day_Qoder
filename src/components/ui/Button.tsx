import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

// Button变体类型
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

// Button大小类型
export type ButtonSize = 'sm' | 'md' | 'lg';

// Button属性接口
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

// Button样式映射
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 text-gray-700',
  success: 'bg-green-500 hover:bg-green-600 focus:ring-green-500 text-white',
  warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 text-white',
  danger: 'bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500 text-gray-700'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

const baseStyles = [
  'inline-flex items-center justify-center',
  'font-medium rounded-lg',
  'border border-transparent',
  'transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
].join(' ');

// Button组件
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';