import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export type DockItem = { title: string; icon: React.ReactNode; href: string; onClick?: () => void };

export function FloatingDock({ items, className }: { items: DockItem[]; className?: string }) {
  const mouseX = useMotionValue<number>(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex h-16 items-end gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 pb-3 backdrop-blur-xl shadow-2xl",
        className,
      )}
    >
      {items.map((it) => (
        <Icon key={it.title} mouseX={mouseX} {...it} />
      ))}
    </motion.div>
  );
}

function Icon({ title, icon, href, onClick, mouseX }: DockItem & { mouseX: ReturnType<typeof useMotionValue<number>> }) {
  const ref = useRef<HTMLDivElement>(null);
  const dist = useTransform(mouseX, (v) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return v - b.x - b.width / 2;
  });
  const size = useSpring(useTransform(dist, [-150, 0, 150], [40, 72, 40]), { mass: 0.1, stiffness: 150, damping: 12 });
  const [hover, setHover] = useState(false);

  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        className="relative flex aspect-square items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <AnimatePresence>
          {hover && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: -4 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute -top-9 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-white"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-center [&_svg]:size-5">{icon}</div>
      </motion.div>
    </a>
  );
}
