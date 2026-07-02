// Design-system Button. Consolidates the many ad-hoc button styles across the
// app into a single set of variants and sizes. Renders a <button> by default,
// an <a> when `href` is given, or any component via `as` (e.g. react-router Link).
const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-card',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20',
  outline: 'border-2 border-primary/30 text-primary hover:bg-primary hover:text-white',
  ghost: 'text-slate-600 dark:text-dark-muted hover:bg-light-card dark:hover:bg-dark-card',
  danger: 'bg-error text-white hover:bg-red-600',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  as,
  href,
  className = '',
  children,
  ...props
}) {
  const Comp = as || (href ? 'a' : 'button');
  const classes = `inline-flex items-center justify-center rounded-btn font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`.trim();
  return (
    <Comp className={classes} href={href} {...props}>
      {children}
    </Comp>
  );
}
