import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`
        block px-4 py-3 rounded-xl 
        border-2 border-gray-300 
        focus:border-purple-500 focus:ring focus:ring-purple-200 focus:ring-opacity-50
        transition-all duration-200
        placeholder-gray-400
        ${className}
      `}
      {...props}
    />
  );
};

export default Input;