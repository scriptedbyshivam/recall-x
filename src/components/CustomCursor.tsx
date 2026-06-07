import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * Site-wide custom cursor: a small dot + a bigger ring that lags behind
 * with spring smoothing. Grows + becomes accent-tinted on interactive
 * elements (a, button, input, textarea, [role=button], [data-cursor=hover]).
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // disable on touch
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.documentElement.classList.add("hide-native-cursor");

    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!visible) setVisible(true);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
      const t = e.target as HTMLElement | null;
      const interactive = !!t?.closest("a,button,input,textarea,select,[role=button],[data-cursor=hover]");
      setHover(interactive);
    };
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    let raf = requestAnimationFrame(loop);
    window.addEventListener("mousemove", onMove);
    const onLeave = () => setVisible(false);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("hide-native-cursor");
    };
  }, [visible]);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-white mix-blend-difference"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
      />
      <motion.div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] rounded-full border border-white/70 mix-blend-difference"
        animate={{
          width: hover ? 56 : 28,
          height: hover ? 56 : 28,
          opacity: visible ? 1 : 0,
          borderColor: hover ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.7)",
        }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      />
    </>
  );
}
