import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "diagonal";
type Shape = "square" | "hexagon" | "circle" | "triangle";

type Props = {
  className?: string;
  speed?: number;
  squareSize?: number;
  direction?: Direction;
  borderColor?: string;
  hoverFillColor?: string;
  shape?: Shape;
  hoverTrailAmount?: number;
};

export function ShapeGrid({
  className,
  speed = 0.32,
  squareSize = 40,
  direction = "diagonal",
  borderColor = "#2F293A",
  hoverFillColor = "#7c3aed",
  shape = "square",
  hoverTrailAmount = 9,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const trailRef = useRef<{ x: number; y: number; life: number }[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let offset = 0;
    let w = 0, h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      mouseRef.current = { x, y };
      if (hoverTrailAmount > 0) {
        trailRef.current.unshift({ x, y, life: 1 });
        if (trailRef.current.length > hoverTrailAmount) trailRef.current.length = hoverTrailAmount;
      }
    };
    const onLeave = () => { mouseRef.current = null; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const drawShape = (cx: number, cy: number, size: number, fill?: string) => {
      ctx.beginPath();
      const r = size / 2 - 1;
      if (shape === "circle") {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (shape === "hexagon") {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (shape === "triangle") {
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.lineTo(cx - r, cy + r);
        ctx.closePath();
      } else {
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
      }
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      offset += speed;
      const s = squareSize;
      const dx = direction === "left" ? -offset : direction === "right" ? offset : direction === "diagonal" ? offset : 0;
      const dy = direction === "up" ? -offset : direction === "down" ? offset : direction === "diagonal" ? offset : 0;
      const ox = ((dx % s) + s) % s;
      const oy = ((dy % s) + s) % s;

      const cols = Math.ceil(w / s) + 2;
      const rows = Math.ceil(h / s) + 2;

      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          const cx = i * s - ox + s / 2;
          const cy = j * s - oy + s / 2;
          let fill: string | undefined;
          if (mouseRef.current) {
            const mdx = cx - mouseRef.current.x;
            const mdy = cy - mouseRef.current.y;
            const d = Math.hypot(mdx, mdy);
            if (d < s * 0.6) fill = hoverFillColor;
          }
          // trail
          if (!fill && trailRef.current.length) {
            for (let t = 0; t < trailRef.current.length; t++) {
              const p = trailRef.current[t];
              const d = Math.hypot(cx - p.x, cy - p.y);
              if (d < s * 0.6) {
                const alpha = (1 - t / trailRef.current.length) * 0.4;
                fill = hexWithAlpha(hoverFillColor, alpha);
                break;
              }
            }
          }
          drawShape(cx, cy, s, fill);
        }
      }
      // decay trail
      trailRef.current = trailRef.current.map((p) => ({ ...p, life: p.life - 0.05 })).filter((p) => p.life > 0);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [speed, squareSize, direction, borderColor, hoverFillColor, shape, hoverTrailAmount]);

  return <canvas ref={ref} className={cn("h-full w-full block", className)} />;
}

function hexWithAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default ShapeGrid;
