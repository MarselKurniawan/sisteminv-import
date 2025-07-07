import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon: Icon
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white focus:ring-blue-500 disabled:from-blue-300 disabled:to-blue-300 shadow-lg hover:shadow-xl',
    secondary: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white focus:ring-purple-500 disabled:from-purple-300 disabled:to-purple-300 shadow-lg hover:shadow-xl',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white focus:ring-emerald-500 disabled:from-emerald-300 disabled:to-emerald-300 shadow-lg hover:shadow-xl',
    warning: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white focus:ring-orange-500 disabled:from-orange-300 disabled:to-orange-300 shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white focus:ring-red-500 disabled:from-red-300 disabled:to-red-300 shadow-lg hover:shadow-xl',
    ghost: 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 focus:ring-gray-500 hover:text-gray-700'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'cursor-not-allowed opacity-50 transform-none hover:scale-100' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};