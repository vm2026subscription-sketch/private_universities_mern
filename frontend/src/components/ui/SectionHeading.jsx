import { cn } from "../../utils/cn";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="text-caption font-semibold uppercase tracking-widest text-primary mb-2">
            {eyebrow}
          </p>
        )}
        <Tag className="text-h2 text-light-text dark:text-dark-text">{title}</Tag>
        {description && (
          <p className="mt-2 max-w-2xl text-body-sm text-light-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
