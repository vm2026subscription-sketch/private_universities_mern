import { cn } from "../../utils/cn";
import Button from "./Button";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-lg border border-dashed border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50",
        className
      )}
      role="status"
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-h3 text-light-text dark:text-dark-text">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-body-sm text-light-muted">{description}</p>
      )}
      {children}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionTo && !onAction && (
        <Button className="mt-6" asChild>
          <a href={actionTo}>{actionLabel}</a>
        </Button>
      )}
    </div>
  );
}
