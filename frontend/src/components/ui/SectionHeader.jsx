// Design-system section header. Consistent eyebrow + title + optional action,
// replacing the many ad-hoc uppercase-tracking headings across pages.
export default function SectionHeader({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 mb-6 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-link mb-1">{eyebrow}</p>
        )}
        {title && (
          <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">{title}</h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
