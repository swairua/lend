import * as React from "react";
import { cn } from "@/lib/utils";

const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85 shadow-md hover:shadow-lg",
  destructive: "bg-destructive text-destructive-foreground hover:bg-primary/20",
  outline: "border border-input bg-background hover:bg-primary/10 hover:text-primary",
  secondary: "bg-secondary text-secondary-foreground hover:bg-primary/20",
  ghost: "hover:bg-primary/10 hover:text-primary",
  link: "text-primary underline-offset-4 hover:underline hover:text-primary",
};

const sizeStyles = {
  default: "min-h-[44px] h-10 sm:h-10 px-4 py-2 text-sm sm:text-sm",
  sm: "min-h-[44px] h-9 sm:h-9 rounded-md px-3 text-xs sm:text-sm",
  lg: "min-h-[44px] h-11 sm:h-12 rounded-md px-8 text-base",
  icon: "min-h-[44px] w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(baseStyles, variantStyles[variant], sizeStyles[size], (children.props as any).className),
        ref,
        ...props,
      } as any);
    }

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
