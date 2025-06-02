import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500',
    secondary: 'bg-teal-500 hover:bg-teal-600 text-white focus:ring-teal-400',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400',
    success: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400',
  };
  
  const sizeStyles = {
    small: 'text-sm px-3 py-1.5',
    medium: 'text-base px-4 py-2',
    large: 'text-lg px-6 py-3',
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const disabledStyles = props.disabled ? 'opacity-60 cursor-not-allowed' : '';
  
  return (
    <button
      className={`
        ${baseStyles} 
        ${variantStyles[variant]} 
        ${sizeStyles[size]} 
        ${widthStyles} 
        ${disabledStyles} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;