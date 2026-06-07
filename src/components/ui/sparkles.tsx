import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  background?: string;
  particleColor?: string;
  particleDensity?: number;
  minSize?: number;
  maxSize?: number;
};

export function SparklesCore({
  className,
  background = "transparent",
  particleColor = "#ffffff",
  particleDensity = 100,
  minSize = 0.4,
  maxSize = 1.2,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let particles: { x: number; y: number; r: number; o: number; s: number }[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const count = Math.floor((rect.width * rect.height) / 8000 * (particleDensity / 100));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: minSize + Math.random() * (maxSize - minSize),
        o: Math.random(),
        s: 0.005 + Math.random() * 0.02,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
      for (const p of particles) {
        p.o += p.s;
        if (p.o > 1 || p.o < 0) p.s = -p.s;
        ctx.beginPath();
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = Math.abs(Math.sin(p.o * Math.PI));
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [background, particleColor, particleDensity, minSize, maxSize]);

  return <canvas ref={ref} className={cn("h-full w-full", className)} />;
}
