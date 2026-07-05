import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../../utils/cn";

export default function Breadcrumbs({ items = [], className }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-body-sm text-light-muted">
        <li>
          <Link
            to="/"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="hover:text-primary transition-colors truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span className="text-light-text dark:text-dark-text font-medium truncate max-w-[240px]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
