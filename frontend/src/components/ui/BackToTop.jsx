import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "../../utils/cn";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-md",
        "bg-primary text-white shadow-elevation-2 hover:bg-primary-dark transition-all",
        "md:bottom-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
