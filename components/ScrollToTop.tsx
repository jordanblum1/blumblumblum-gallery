import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

// Appears once the wall is scrolled past roughly a viewport and a half, which
// keeps it out of the way on short screens where the grid barely scrolls.
const SHOW_AFTER_VIEWPORTS = 1.5;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORTS);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll back to top"
      // Kept mounted so it can fade rather than pop, but pulled out of the tab
      // order and hit-testing while hidden.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      className={`fixed bottom-6 right-6 z-30 rounded-full border border-[var(--hairline)] bg-[var(--panel)] p-3 text-[var(--ink-muted)] backdrop-blur-lg transition duration-[var(--duration-default)] ease-[var(--ease)] hover:border-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent)] motion-reduce:transition-none ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUpIcon className="h-5 w-5" />
    </button>
  );
}
