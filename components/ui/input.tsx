import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  variant?: 'default' | 'glass';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    const variantClasses = variant === 'glass'
      ? 'bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:border-white/40 focus-visible:ring-white/40'
      : 'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring';

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-h-[44px] w-full rounded-lg px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          variant === 'default' && 'border border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring',
          variant === 'glass' && 'border border-white/20 ' + variantClasses,
          type === "number" && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
