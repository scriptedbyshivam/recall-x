"use client";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * Interactive grid of boxes. Click a cell to send a ripple of colored
 * highlights outward. Designed as a subtle full-screen fixed background.
 */
export const BackgroundRippleEffect = ({
  cellSize = 80,
  className,
  interactive = true,
}: {
  cellSize?: number;
  className?: string;
  interactive?: boolean;
}) => {
  const [clicked, setClicked] = useState<{ r: number; c: number; id: number } | null>(null);
  const [dims, setDims] = useState({ rows: 12, cols: 22 });

  useEffect(() => {
    const update = () => {
      const cols = Math.ceil(window.innerWidth / cellSize) + 2;
      const rows = Math.ceil(window.innerHeight / cellSize) + 2;
      setDims({ rows, cols });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [cellSize]);

  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full overflow-hidden",
        "[mask-image:radial-gradient(ellipse_at_center,white_5%,transparent_70%)]",
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <DivGrid
          rows={dims.rows}
          cols={dims.cols}
          cellSize={cellSize}
          clicked={clicked}
          onCellClick={(r, c) => setClicked({ r, c, id: Date.now() })}
          interactive={interactive}
        />
      </div>
    </div>
  );
};

type Clicked = { r: number; c: number; id: number } | null;

const DivGrid = ({
  rows,
  cols,
  cellSize,
  clicked,
  onCellClick,
  interactive,
}: {
  rows: number;
  cols: number;
  cellSize: number;
  clicked: Clicked;
  onCellClick: (r: number, c: number) => void;
  interactive: boolean;
}) => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!clicked) return;
    setVersion((v) => v + 1);
  }, [clicked]);

  const cells = Array.from({ length: rows * cols });

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        width: cols * cellSize,
        height: rows * cellSize,
      }}
    >
      {cells.map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        let delay = 0;
        let intensity = 0;
        if (clicked) {
          const d = Math.hypot(r - clicked.r, c - clicked.c);
          delay = d * 55;
          intensity = Math.max(0, 1 - d / 7);
        }
        return (
          <Cell
            key={`${idx}-${version}`}
            size={cellSize}
            delay={delay}
            intensity={intensity}
            onClick={() => interactive && onCellClick(r, c)}
            interactive={interactive}
          />
        );
      })}
    </div>
  );
};

const Cell = ({
  size,
  delay,
  intensity,
  onClick,
  interactive,
}: {
  size: number;
  delay: number;
  intensity: number;
  onClick: () => void;
  interactive: boolean;
}) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (intensity <= 0) return;
    const t = setTimeout(() => {
      setActive(true);
      setTimeout(() => setActive(false), 500);
    }, delay);
    return () => clearTimeout(t);
  }, [delay, intensity]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "border-[0.5px] border-white/[0.04] transition-colors duration-500 ease-out",
        interactive && "hover:bg-violet-500/10",
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: active ? `rgba(167,139,250,${0.22 * intensity})` : "transparent",
        boxShadow: active ? `0 0 18px rgba(167,139,250,${0.18 * intensity})` : undefined,
      }}
    />
  );
};

export default BackgroundRippleEffect;
