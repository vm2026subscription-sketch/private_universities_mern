import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800",
        info: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
        sponsored: "bg-primary text-white border border-primary-dark",
        outline: "bg-transparent border border-light-border dark:border-dark-border text-light-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export default function Badge({ className, variant, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };
