import { cn } from "@/lib/utils";

export function AuroraText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block bg-clip-text text-transparent",
        "bg-[linear-gradient(110deg,#a78bfa,45%,#22d3ee,55%,#f472b6)] bg-[length:200%_100%]",
        "animate-[shine_6s_linear_infinite]",
        className,
      )}
    >
      {children}
    </span>
  );
}
