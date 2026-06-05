import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <div className="relative flex items-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground appearance-none cursor-pointer",
          className,
        )}
        {...props}
      />
      <Check className="absolute h-4 w-4 pointer-events-none text-primary-foreground peer-checked:block hidden left-0 top-0" />
    </div>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
