"use client";
import { useEffect, useRef } from "react";

/** Drifting aurora + soft spotlight that follows the cursor. */
export default function Ambient() {
  const spot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const h = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (spot.current) spot.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      });
    };
    window.addEventListener("pointermove", h, { passive: true });
    return () => {
      window.removeEventListener("pointermove", h);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <>
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div ref={spot} className="spotlight" aria-hidden style={{ transform: "translate(-999px,-999px)" }} />
    </>
  );
}
