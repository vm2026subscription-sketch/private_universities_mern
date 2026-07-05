import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-elevation-1 hover:bg-primary-dark hover:shadow-elevation-2 active:scale-[0.98]",
        secondary:
          "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-elevation-1 hover:opacity-90 active:scale-[0.98]",
        outline:
          "border-2 border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-transparent hover:border-primary hover:text-primary dark:hover:border-primary",
        ghost:
          "text-light-muted hover:bg-slate-100 hover:text-light-text dark:hover:bg-dark-card dark:hover:text-dark-text",
        danger:
          "bg-error text-white shadow-elevation-1 hover:bg-red-600 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline min-h-0 p-0",
      },
      size: {
        sm: "h-9 px-3 text-body-sm rounded-md",
        md: "h-11 px-5 text-body-sm rounded-md",
        lg: "h-12 px-6 text-body rounded-md",
        icon: "h-11 w-11 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = forwardRef(function Button(
  { className, variant, size, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </button>
  );
});

export { Button, buttonVariants };
export default Button;
