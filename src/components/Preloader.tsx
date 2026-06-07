import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const STORAGE_KEY = "recallx_preloader_shown_v1";

export function Preloader() {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only show once per session
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) {
      setShow(false);
      return;
    }
    const start = Date.now();
    const duration = 2200;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setTimeout(() => setShow(false), 600);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.18_0.08_295)_0%,transparent_60%)] opacity-60" />
          <div className="absolute inset-0 bg-grid mask-radial-fade opacity-40" />

          {/* center wordmark */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-[14vw] md:text-[10vw] font-display tracking-[-0.06em] leading-none gradient-text select-none"
            >
              RecallX
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-4 text-[10px] md:text-xs uppercase tracking-[0.5em] text-white/40 font-mono"
            >
              Memory · Intelligence · Recall
            </motion.div>

            {/* progress */}
            <div className="mt-12 w-[240px] md:w-[320px] h-px bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-3 font-mono text-[10px] tracking-[0.3em] text-white/30">
              {String(Math.floor(progress * 100)).padStart(3, "0")}
            </div>
          </div>

          {/* bottom marquee-ish hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-8 left-0 right-0 flex justify-between px-8 text-[10px] uppercase tracking-[0.3em] text-white/30 font-mono"
          >
            <span>EST · 2026</span>
            <span>v1.0 · Hybrid Memory</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
