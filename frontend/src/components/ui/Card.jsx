import { cn } from "../../utils/cn";

export default function Card({ className, children, hover = false, padding = "md", ...props }) {
  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <div
      className={cn(
        "card",
        paddingClass,
        hover && "hover-lift",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ className, children, as: Tag = "h3" }) {
  return <Tag className={cn("text-h3 text-light-text dark:text-dark-text", className)}>{children}</Tag>;
}

export function CardDescription({ className, children }) {
  return <p className={cn("text-body-sm text-light-muted mt-1", className)}>{children}</p>;
}
