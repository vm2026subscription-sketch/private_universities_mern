// Design-system badge. Semantic variants with light/dark support.
const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-dark-muted',
  brand: 'bg-primary/10 text-link dark:text-primary-300',
  success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

export default function Badge({ variant = 'neutral', className = '', children, ...props }) {
  const classes = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${VARIANTS[variant] || VARIANTS.neutral} ${className}`.trim();
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
