import { cn } from "../../utils/cn";

export default function PageContainer({ className, children, narrow = false }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-20 md:pb-8",
        narrow ? "max-w-3xl" : "max-w-container",
        className
      )}
    >
      {children}
    </div>
  );
}
