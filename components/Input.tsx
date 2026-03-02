import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">{label}</label>}
      <input
        className={`w-full bg-nexus-900 border-none text-gray-100 p-2.5 rounded focus:ring-2 focus:ring-nexus-accent outline-none transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-nexus-red text-xs mt-1">{error}</p>}
    </div>
  );
};