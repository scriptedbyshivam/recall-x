import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { gsap } from "gsap";
import { Toaster } from "@/components/ui/sonner";
import { SparklesCore } from "@/components/ui/sparkles";
import { ShapeGrid } from "@/components/ShapeGrid";
import { AuroraText } from "@/components/AuroraText";

import {
  ArrowRight,
  Brain,
  Sparkles,
  Database,
  MessageSquare,
  Target,
  Play,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RecallX — The Memory Engine for Marketers" },
      { name: "description", content: "An AI agent that remembers every post, learns every pattern, and tells you exactly what to publish next." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="overflow-x-hidden">
      <TopNav />
      <Hero />
      
      <Features />
      
      
      <HowItWorks />
      <CTA />
      <Footer />
      <Toaster richColors position="top-right" theme="dark" />
    </main>
  );
}



/* ===================== TOP NAV ===================== */

function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/40 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center">
            <Brain className="h-4 w-4 text-black" />
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 blur-md opacity-50 -z-10" />
          </div>
          <span className="font-display text-xl tracking-tight">RecallX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#recommender" className="hover:text-white transition">Recommender</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
        </nav>
        <Link to="/app" className="group inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition">
          Launch app <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </header>
  );
}

/* ===================== HERO ===================== */

function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!headlineRef.current) return;
    const letters = headlineRef.current.querySelectorAll(".letter");
    gsap.fromTo(
      letters,
      { y: 120, opacity: 0, rotateX: -90 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.04, ease: "expo.out", delay: 0.2 },
    );
    if (subRef.current) {
      gsap.fromTo(subRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 1.0, ease: "power3.out" });
    }
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Animated shape grid bg */}
      <div className="absolute inset-0 z-0">
        <ShapeGrid
          speed={0.32}
          squareSize={44}
          direction="diagonal"
          borderColor="#2a2440"
          hoverFillColor="#a78bfa"
          shape="hexagon"
          hoverTrailAmount={9}
        />
      </div>
      {/* Vignette fade so center text stays readable */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_75%)]" />

      {/* Glow orbs */}
      <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-violet-600/30 blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px] animate-glow-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[150px]" />

      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs text-white/70 mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Powered by Hindsight Memory · Built for HackBaroda
        </motion.div>

        <h1
          ref={headlineRef}
          className="font-display text-[18vw] md:text-[12rem] lg:text-[14rem] leading-[0.85] tracking-[-0.05em] text-balance"
          style={{ perspective: "1000px" }}
        >
          {"RecallX".split("").map((c, i) => (
            <span
              key={i}
              className="letter inline-block gradient-text"
              style={{ display: "inline-block", transformStyle: "preserve-3d" }}
            >
              {c}
            </span>
          ))}
        </h1>

        <p ref={subRef} className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-white/60 leading-relaxed">
          The <span className="font-serif italic text-white">memory engine</span> for marketers.
          Remembers every post you ship. Learns what works.{" "}
          <AuroraText className="font-medium">Tells you exactly what to publish next.</AuroraText>
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/app"
            className="group relative inline-flex items-center gap-2 rounded-full bg-white text-black px-7 py-3.5 text-sm font-medium hover:bg-white/90 transition overflow-hidden"
          >
            <span className="relative z-10">Launch the agent</span>
            <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition" />
          </Link>
          <a
            href="#recommender"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-7 py-3.5 text-sm text-white hover:bg-white/10 transition"
          >
            <Play className="h-3.5 w-3.5" /> Try the demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-20 text-[10px] uppercase tracking-[0.3em] text-white/30"
        >
          ↓ Scroll to explore
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ===================== MARQUEE ===================== */

function Marquee() {
  const items = [
    "Hindsight Memory", "Gemini 2.5", "Postgres", "Hybrid Recall", "TanStack Start",
    "Semantic Search", "Brand Voice", "Engagement Patterns", "Content Gaps", "AI Strategist",
  ];
  return (
    <section className="relative py-12 border-y border-white/5 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="mx-8 font-display text-2xl md:text-4xl text-white/20 hover:text-white/60 transition">
            ✦ {t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ===================== FEATURES (BENTO) ===================== */

function Features() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Capabilities"
          title={<>One agent. <AuroraText>Total recall.</AuroraText></>}
          sub="Built on a hybrid memory architecture — Postgres for facts, Hindsight for meaning. Together they make your AI actually remember."
        />

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[200px]">
          <BentoCard className="md:col-span-2 md:row-span-2" icon={<Database />} title="Hindsight Memory" desc="Every post you ship lands in a semantic memory bank. Recall is meaning-aware — not keyword matching.">
            <div className="absolute bottom-0 right-0 w-2/3 h-2/3 pointer-events-none">
              <SparklesCore particleColor="#67e8f9" particleDensity={50} />
            </div>
          </BentoCard>
          <BentoCard icon={<TrendingUp />} title="Performance Analysis" desc="Find what actually moved the needle — by topic, platform, format." />
          <BentoCard icon={<Sparkles />} title="Smart Recommendations" desc="Next 3-5 posts, ranked by predicted engagement." />
          <BentoCard icon={<Target />} title="Content Gap Finder" desc="Surface untapped angles your competitors already own." />
          <BentoCard icon={<MessageSquare />} title="Memory-Powered Chat" desc="Ask anything. Get answers cited to your real data." />
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  icon, title, desc, className, children,
}: { icon: React.ReactNode; title: string; desc: string; className?: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 hover:border-white/20 transition ${className ?? ""}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-violet-300 [&_svg]:size-5">{icon}</div>
        <h3 className="mt-4 font-display text-xl text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{desc}</p>
      </div>
      <div className="absolute -top-px left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
      {children}
    </motion.div>
  );
}






/* ===================== HOW IT WORKS ===================== */

function HowItWorks() {
  const steps = [
    { n: "01", title: "Ingest", desc: "Add posts via form, CSV, or seed demo. Each row writes to Postgres AND embeds into Hindsight." },
    { n: "02", title: "Recall", desc: "Ask anything. Hindsight finds semantically similar memories. Postgres provides exact aggregates." },
    { n: "03", title: "Reason", desc: "Gemini 2.5 synthesizes both — structured output, citations, real numbers, real ideas." },
  ];
  return (
    <section id="how" className="relative py-32 px-6 border-t border-white/5">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Architecture"
          title={<>Three steps. <AuroraText>One brain.</AuroraText></>}
          sub="Hybrid memory means the agent never forgets — and never hallucinates."
        />
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8"
            >
              <div className="font-mono text-xs text-white/30">{s.n}</div>
              <h3 className="mt-3 font-display text-2xl text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{s.desc}</p>
              <div className="absolute top-6 right-6 h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================== CTA ===================== */

function CTA() {
  return (
    <section className="relative py-32 px-6 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-grid mask-radial-fade opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-violet-600/30 blur-[120px]" />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display text-5xl md:text-7xl tracking-tight text-balance">
          Stop guessing. <br />
          <AuroraText>Start remembering.</AuroraText>
        </h2>
        <p className="mt-6 text-white/60 max-w-xl mx-auto">
          The agent is live, the memory is empty. Add your first post and watch it learn.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 rounded-full bg-white text-black px-8 py-4 text-sm font-medium hover:bg-white/90 transition"
          >
            Open dashboard <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-8 py-4 text-sm text-white hover:bg-white/10 transition"
          >
            <MessageSquare className="h-4 w-4" /> Chat with memory
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===================== FOOTER ===================== */

function Footer() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Dashboard", href: "/app" },
        { label: "Chat", href: "/chat" },
        { label: "Recommender", href: "/#recommender" },
        { label: "How it works", href: "/#how" },
      ],
    },
    {
      title: "Engine",
      links: [
        { label: "Hindsight Memory", href: "/#features" },
        { label: "Gemini 2.5", href: "/#features" },
        { label: "Hybrid Recall", href: "/#features" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "HackBaroda 2026", href: "#" },
        { label: "Manifesto", href: "#" },
        { label: "Contact", href: "mailto:hello@recallx.app" },
      ],
    },
  ];

  return (
    <footer className="relative pt-24 px-6 border-t border-white/5 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center">
                <Brain className="h-5 w-5 text-black" />
                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 blur-md opacity-40 -z-10" />
              </div>
              <span className="font-display text-xl tracking-tight text-white">RecallX</span>
            </div>
            <p className="mt-5 text-sm text-white/40 leading-relaxed max-w-xs">
              © RecallX 2026. All rights reserved. The memory engine for marketers.
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div className="font-display text-sm text-white">{c.title}</div>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-white/50 hover:text-white transition story-link"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant wordmark */}
        <div className="mt-24 pb-8 select-none">
          <div className="font-display text-[22vw] leading-[0.85] tracking-[-0.06em] text-white/[0.04] text-center">
            RecallX
          </div>
        </div>
      </div>
    </footer>
  );
}


/* ===================== SHARED ===================== */

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-3xl mx-auto"
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">{eyebrow}</div>
      <h2 className="mt-4 font-display text-5xl md:text-6xl tracking-tight text-balance text-white">{title}</h2>
      <p className="mt-4 text-white/50">{sub}</p>
    </motion.div>
  );
}
