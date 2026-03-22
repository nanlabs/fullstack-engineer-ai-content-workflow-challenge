import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")]',
            'bg-[position:right_0.5rem_center] bg-[size:1.25rem] bg-no-repeat pr-9',
            'transition-colors',
            error && 'border-red-400 focus:ring-red-500',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
