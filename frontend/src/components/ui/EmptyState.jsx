// Design-system empty state. One consistent look for "no data" across the app.
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-16 px-4 ${className}`.trim()}>
      {Icon && (
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-light-card dark:bg-dark-card flex items-center justify-center">
          <Icon className="w-7 h-7 text-light-muted dark:text-dark-muted" aria-hidden="true" />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</h3>}
      {description && (
        <p className="mt-1 text-sm text-light-muted dark:text-dark-muted max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
