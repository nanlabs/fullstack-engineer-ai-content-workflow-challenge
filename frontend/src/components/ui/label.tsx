import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium text-gray-700 leading-none',
          className,
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
    );
  },
);

Label.displayName = 'Label';
