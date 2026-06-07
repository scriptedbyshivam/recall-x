import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AuroraText } from "@/components/AuroraText";
import { recommendPlatform } from "@/lib/analysis";
import { ArrowLeft, Loader2, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/recommender")({
  head: () => ({
    meta: [
      { title: "Platform Recommender — RecallX" },
      { name: "description", content: "Drop a post idea. RecallX tells you the best platform, caption, hashtags, and the perfect time to publish." },
      { property: "og:title", content: "Platform Recommender — RecallX" },
      { property: "og:description", content: "AI-powered platform recommendations from your content memory." },
    ],
  }),
  component: RecommenderPage,
});

function RecommenderPage() {
  const fn = useServerFn(recommendPlatform);
  const [text, setText] = useState("");
  const m = useMutation({
    mutationFn: (postIdea: string) => fn({ data: { postIdea } }),
    onError: (e) => toast.error(e.message),
  });
  const r = m.data;

  const examples = [
    "Behind-the-scenes of building an AI agent in 48 hours",
    "5 prompt engineering mistakes that kill your output quality",
    "I quit my $200k job to bootstrap a SaaS — week 1",
  ];

  return (
    <main className="relative min-h-screen overflow-hidden pt-28 pb-32 px-6">
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-grid opacity-20 mask-radial-fade pointer-events-none" />
      <div className="absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/25 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-4 py-1.5 text-xs text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live demo · Powered by your memory
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl tracking-tight text-balance text-white">
            Where should this post <AuroraText>actually live?</AuroraText>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/80 leading-relaxed">
            Drop a post idea. The agent reads your memory and brand voice, then tells you the best platform, the optimized caption, the right hashtags, and the perfect time to publish.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur p-7">
            <label className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-mono">Your post idea</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. A carousel showing how memory makes AI agents smarter, with 3 real examples"
              className="mt-3 min-h-[200px] resize-none bg-black/40 border-white/15 text-white text-base placeholder:text-white/40 focus-visible:ring-violet-500"
            />
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60 font-mono mb-2">Try an example</div>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    className="text-xs rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/85 hover:text-white hover:border-white/40 hover:bg-white/10 transition"
                  >
                    {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => text.trim() && m.mutate(text.trim())}
              disabled={!text.trim() || m.isPending}
              className="mt-6 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 h-12 text-base"
            >
              {m.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Recommend platform
            </Button>
          </div>

          {/* Output */}
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-violet-950/30 via-black/60 to-cyan-950/30 backdrop-blur p-7 min-h-[420px] relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10" />
            {!r && !m.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/70 relative z-10">
                <Sparkles className="h-10 w-10 mb-4 text-violet-300" />
                <p className="text-base">Results will appear here</p>
                <p className="text-xs text-white/50 mt-1">Drop a post idea on the left to begin</p>
              </div>
            )}
            {m.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-white/80 text-sm relative z-10">
                <Loader2 className="h-7 w-7 animate-spin mb-3" />
                Reading memory and analyzing…
              </div>
            )}
            {r && !r.ok && <p className="text-sm text-red-300 relative z-10">{r.error}</p>}
            {r && r.ok && (
              <div className="relative z-10 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-mono">Best platform</div>
                    <div className="mt-1 font-display text-5xl gradient-text">{r.rec.best_platform}</div>
                    <div className="mt-1 text-xs text-white/60 font-mono">
                      confidence {Math.round((r.rec.confidence ?? 0) * 100)}% · {r.memoryCount} memories used
                    </div>
                  </div>
                  <div className="text-right text-sm text-white/80 max-w-[45%]">{r.rec.best_time}</div>
                </div>
                <p className="text-base text-white/90 leading-relaxed">{r.rec.reason}</p>
                <div className="rounded-xl border border-white/15 bg-black/50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-2 font-mono">Optimized caption</div>
                  <p className="text-base text-white whitespace-pre-wrap leading-relaxed">{r.rec.optimized_caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.rec.hashtags?.map((h, i) => (
                      <span key={i} className="text-xs font-mono text-cyan-200">#{h.replace(/^#/, "")}</span>
                    ))}
                  </div>
                </div>
                {r.rec.alternates?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-2 font-mono">Also consider</div>
                    <div className="grid grid-cols-2 gap-2">
                      {r.rec.alternates.map((a, i) => (
                        <div key={i} className="rounded-lg border border-white/15 bg-white/5 p-3">
                          <div className="text-sm text-white font-medium">{a.platform}</div>
                          <div className="text-xs text-white/70 mt-1 leading-relaxed">{a.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster richColors position="top-right" theme="dark" />
    </main>
  );
}
