import type { InputHTMLAttributes } from 'react';

type InputProps = {
  icon?: React.ComponentType<{ className?: string; size?: number }>;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({ type = 'text', placeholder, icon: Icon, ...rest }: InputProps) {
  return (
    <div className="relative group">
      {Icon && (
        <Icon
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#9CAF88] transition-colors"
          size={20}
        />
      )}
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-6 pl-12 outline-none focus:border-[#9CAF88] focus:ring-2 focus:ring-[#9CAF88]/20 transition-all text-gray-700 placeholder-gray-400"
        {...rest}
      />
    </div>
  );
}
