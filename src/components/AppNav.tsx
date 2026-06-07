import { Link } from "@tanstack/react-router";
import { Brain, MessageSquare, LayoutDashboard } from "lucide-react";

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg">Hindsight</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Content Strategy Agent</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground"
            activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 bg-secondary text-foreground" }}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground"
            activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 bg-secondary text-foreground" }}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </Link>
        </nav>
      </div>
    </header>
  );
}
