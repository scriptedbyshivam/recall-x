import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { SmoothScroll } from "../components/SmoothScroll";
import { Preloader } from "../components/Preloader";
import { CustomCursor } from "../components/CustomCursor";
import { FloatingDock } from "../components/ui/floating-dock";
import { BackgroundRippleEffect } from "../components/ui/background-ripple-effect";
import {
  IconHome,
  IconLayoutDashboard,
  IconMessageCircle,
  IconSparkles,
} from "@tabler/icons-react";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in memory</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist in our memory bank.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Try again</button>
          <a href="/" className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RecallX — The Memory Engine for Marketers" },
      { name: "description", content: "RecallX is an AI agent that remembers every post, learns every pattern, and tells you exactly what to publish next." },
      { property: "og:title", content: "RecallX — The Memory Engine for Marketers" },
      { property: "og:description", content: "An AI agent that remembers every post, learns every pattern, and tells you exactly what to publish next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Preloader />
      <SmoothScroll />
      <CustomCursor />

      <div className="relative min-h-screen bg-background text-foreground">
        {/* Site-wide interactive ripple background — subtle, behind everything */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <BackgroundRippleEffect />
          {/* Heavy vignette so content stays readable */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_75%)]" />
          <div className="absolute inset-0 bg-background/40" />
        </div>
        <div className="relative z-10">
          <Outlet />
          <DockNav />
        </div>
      </div>
    </QueryClientProvider>
  );
}

function DockNav() {
  return (
    <FloatingDock
      items={[
        { title: "Home", icon: <IconHome />, href: "/" },
        { title: "Dashboard", icon: <IconLayoutDashboard />, href: "/app" },
        { title: "Chat", icon: <IconMessageCircle />, href: "/chat" },
        { title: "Recommender", icon: <IconSparkles />, href: "/recommender" },
      ]}
    />
  );
}
