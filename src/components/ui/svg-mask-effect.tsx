"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const MaskContainer = ({
  children,
  revealText,
  size = 10,
  revealSize = 600,
  className,
}: {
  children?: string | React.ReactNode;
  revealText?: string | React.ReactNode;
  size?: number;
  revealSize?: number;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateMousePosition = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", updateMousePosition);
    return () => el.removeEventListener("mousemove", updateMousePosition);
  }, []);

  const maskSize = isHovered ? revealSize : size;

  return (
    <motion.div
      ref={containerRef}
      className={cn("relative h-screen w-full overflow-hidden", className)}
      animate={{ backgroundColor: isHovered ? "var(--color-background)" : "var(--color-background)" }}
    >
      <motion.div
        className="absolute flex h-full w-full items-center justify-center bg-white text-6xl [mask-repeat:no-repeat]"
        style={{
          WebkitMaskImage: "url(/mask.svg)",
          maskImage: "url(/mask.svg)",
          WebkitMaskPosition: `${(mousePosition.x ?? 0) - maskSize / 2}px ${(mousePosition.y ?? 0) - maskSize / 2}px`,
          WebkitMaskSize: `${maskSize}px`,
          maskSize: `${maskSize}px`,
          transition: "mask-position 0.1s ease, -webkit-mask-position 0.1s ease",
        }}
      >
        <div className="absolute inset-0 z-0 h-full w-full bg-black opacity-50" />
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative z-20 mx-auto max-w-4xl text-center text-4xl font-bold text-white"
        >
          {children}
        </div>
      </motion.div>

      <div className="flex h-full w-full items-center justify-center text-white">{revealText}</div>
    </motion.div>
  );
};
