import { RefObject, useEffect } from "react";

// Adds .is-developed to each .develop child as it enters the viewport,
// driving the darkroom develop-in reveal defined in styles/index.css.
export function useDevelopIn(rootRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-developed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -5% 0px" },
    );
    root.querySelectorAll(".develop").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}
