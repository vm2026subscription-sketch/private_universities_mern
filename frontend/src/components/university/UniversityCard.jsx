import { Link } from "react-router-dom";
import {
  MapPin,
  Bookmark,
  Download,
  Award,
  Star,
  Loader2,
  ExternalLink,
} from "lucide-react";
import UniversityLogo from "../common/UniversityLogo";
import Badge from "../ui/Badge";
import Button, { buttonVariants } from "../ui/Button";
import { cn } from "../../utils/cn";

export default function UniversityCard({
  university: u,
  isSaved,
  onBookmark,
  onDownloadBrochure,
  downloading,
  onApply,
  showApply = false,
  className,
}) {
  return (
    <article
      className={cn(
        "card-interactive hover-lift flex flex-col overflow-hidden h-full",
        u.isSponsored && "ring-1 ring-primary/30",
        className
      )}
    >
      {/* Header badges */}
      <div className="flex items-start justify-between gap-2 p-4 pb-0">
        <div className="flex flex-wrap gap-1.5">
          {u.displayType && (
            <Badge variant="info">{u.displayType}</Badge>
          )}
          {u.isSponsored && (
            <Badge variant="sponsored">Partner</Badge>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onBookmark?.(u._id);
          }}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
            isSaved
              ? "bg-primary text-white"
              : "bg-slate-100 text-light-muted hover:text-primary dark:bg-dark-border"
          )}
          aria-label={isSaved ? "Remove from saved" : "Save university"}
        >
          <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Logo + name */}
      <div className="flex items-start gap-4 px-4 pt-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-light-border bg-white p-2 dark:border-dark-border">
          <UniversityLogo logoUrl={u.logoUrl} name={u.name} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 line-clamp-2 leading-snug">{u.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-body-sm text-light-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">
              {u.city === "Unknown" ? u.state : `${u.city}, ${u.state}`}
            </span>
          </p>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-2 px-4 pt-4 mt-auto">
        {u.naacGrade && (
          <Badge variant="success">
            <Award className="h-3 w-3" aria-hidden="true" />
            NAAC {u.naacGrade}
          </Badge>
        )}
        {u.nirfRank && (
          <Badge variant="default">
            <Star className="h-3 w-3" aria-hidden="true" />
            NIRF #{u.nirfRank}
          </Badge>
        )}
      </div>

      {/* Description snippet */}
      {u.description && (
        <p className="px-4 pt-3 text-body-sm text-light-muted line-clamp-2">
          {u.description}
        </p>
      )}

      {/* Actions — always visible (mobile-friendly) */}
      <div className="mt-4 flex flex-col gap-2 border-t border-light-border p-4 dark:border-dark-border sm:flex-row">
        <Link
          to={`/universities/${u.slug}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1")}
        >
          View Details
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {onDownloadBrochure && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDownloadBrochure(u)}
            disabled={downloading}
            aria-label="Download brochure"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Brochure
          </Button>
        )}
        {showApply && u.isSponsored && onApply && (
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onApply(u)}>
            Apply Now
          </Button>
        )}
      </div>
    </article>
  );
}
