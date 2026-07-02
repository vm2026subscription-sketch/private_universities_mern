// Design-system surface card. One radius, one border, one shadow for the whole
// app. Pass `interactive` for hover elevation (use on clickable cards).
export default function Card({ interactive = false, as: Comp = 'div', className = '', children, ...props }) {
  const classes = `bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-card shadow-card ${interactive ? 'transition-shadow hover:shadow-card-hover' : ''} ${className}`.trim();
  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
}
