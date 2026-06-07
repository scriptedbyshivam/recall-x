import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Target,
  Plus,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";

import {
  listContent,
  addContent,
  bulkAddContent,
  deleteContent,
  clearMemory,
  seedDemoData,
  type ContentInputT,
} from "@/lib/content";
import {
  analyzePerformance,
  recommendContent,
  findContentGaps,
} from "@/lib/analysis";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hindsight Content Strategy Agent" },
      { name: "description", content: "Memory-powered marketing strategist that learns from your past content." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Hero />
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <MemoryPanel />
          <AddContentCard />
          <CsvUploadCard />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <InsightCards />
          <RecentMemory />
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-memory animate-pulse" /> Hindsight Memory · Live
        </div>
        <h1 className="font-display mt-5 text-5xl leading-[1.05] md:text-6xl">
          Stop guessing.<br />
          <span className="text-primary">Let your past content</span> plan your next move.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground">
          Every post you've shipped becomes a memory. The agent reads that memory, finds the patterns, and tells you what to publish next — with the numbers to prove it.
        </p>
      </div>
    </section>
  );
}

function MemoryPanel() {
  const fn = useServerFn(listContent);
  const { data, isLoading } = useQuery({ queryKey: ["memory"], queryFn: () => fn() });
  const count = data?.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <Database className="h-3.5 w-3.5 text-memory" /> Hindsight Memory
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="font-display text-6xl text-memory tabular-nums">{isLoading ? "—" : count}</div>
        <div className="pb-2 text-sm text-muted-foreground">content<br />records stored</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Platforms" value={data ? new Set(data.map((d) => d.platform)).size : 0} />
        <Stat label="Topics" value={data ? new Set(data.map((d) => d.topic)).size : 0} />
        <Stat label="Formats" value={data ? new Set(data.map((d) => d.content_type)).size : 0} />
      </div>
      <SeedAndClear />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="font-mono text-lg tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function SeedAndClear() {
  const qc = useQueryClient();
  const seedFn = useServerFn(seedDemoData);
  const clearFn = useServerFn(clearMemory);
  const seed = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: (r) => { toast.success(`Loaded ${r.inserted} demo memories`); qc.invalidateQueries(); },
    onError: (e) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => { toast.success("Memory cleared"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="mt-4 flex gap-2">
      <Button size="sm" variant="default" className="flex-1" onClick={() => seed.mutate()} disabled={seed.isPending}>
        {seed.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Load demo data
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Clear all memory?")) clear.mutate(); }} disabled={clear.isPending}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const PLATFORMS = ["LinkedIn", "Instagram", "Twitter", "Blog", "YouTube", "TikTok"];
const TYPES = ["Carousel", "Article", "Reel", "Thread", "Long-form", "Short video", "Case study", "Newsletter"];

function AddContentCard() {
  const qc = useQueryClient();
  const fn = useServerFn(addContent);
  const [form, setForm] = useState<ContentInputT>({
    title: "", platform: "LinkedIn", topic: "", content_type: "Carousel",
    likes: 0, shares: 0, comments: 0, published_date: "",
  });
  const m = useMutation({
    mutationFn: (data: ContentInputT) => fn({ data }),
    onSuccess: () => {
      toast.success("Stored in Hindsight Memory");
      setForm({ ...form, title: "", topic: "", likes: 0, shares: 0, comments: 0 });
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); m.mutate(form); }}
      className="rounded-xl border border-border bg-card p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <Plus className="h-3.5 w-3.5" /> Add to memory
      </div>
      <div>
        <Label className="text-xs">Title</Label>
        <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Top 5 AI Marketing Tools" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Platform</Label>
          <select className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}>
            {TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Topic</Label>
        <Input required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="AI Marketing" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Likes" value={form.likes} onChange={(v) => setForm({ ...form, likes: v })} />
        <NumField label="Shares" value={form.shares} onChange={(v) => setForm({ ...form, shares: v })} />
        <NumField label="Comments" value={form.comments} onChange={(v) => setForm({ ...form, comments: v })} />
      </div>
      <div>
        <Label className="text-xs">Published date</Label>
        <Input type="date" value={form.published_date ?? ""} onChange={(e) => setForm({ ...form, published_date: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={m.isPending}>
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Save to memory
      </Button>
    </form>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function CsvUploadCard() {
  const qc = useQueryClient();
  const fn = useServerFn(bulkAddContent);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const header = lines.shift()?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
      const idx = (k: string) => header.indexOf(k);
      const items: ContentInputT[] = lines.map((line) => {
        const cells = parseCsvLine(line);
        return {
          title: cells[idx("title")] ?? "",
          platform: cells[idx("platform")] ?? "LinkedIn",
          topic: cells[idx("topic")] ?? "General",
          content_type: cells[idx("content_type")] ?? cells[idx("type")] ?? "Article",
          likes: Number(cells[idx("likes")] ?? 0) || 0,
          shares: Number(cells[idx("shares")] ?? 0) || 0,
          comments: Number(cells[idx("comments")] ?? 0) || 0,
          published_date: cells[idx("published_date")] || cells[idx("date")] || null,
        };
      }).filter((x) => x.title);
      if (!items.length) throw new Error("No valid rows found");
      const r = await fn({ data: { items } });
      toast.success(`Imported ${r.inserted} memories`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const csv = "title,platform,topic,content_type,likes,shares,comments,published_date\nAI for marketers,LinkedIn,AI Marketing,Carousel,420,80,25,2025-09-01\nSEO checklist,Blog,SEO,Long-form,120,18,9,2025-08-15\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hindsight-sample.csv";
    a.click();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <Upload className="h-3.5 w-3.5" /> Bulk import (CSV)
      </div>
      <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground transition">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        {busy ? "Importing…" : "Click to upload CSV"}
        <input
          type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
        />
      </label>
      <button onClick={downloadSample} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
        Download sample CSV
      </button>
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function InsightCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AnalyzeCard />
      <RecommendCard />
      <GapsCard />
    </div>
  );
}

function InsightShell({
  title, icon, accent, children, run, busy, count, recall,
}: {
  title: string; icon: React.ReactNode; accent: string;
  children: React.ReactNode; run: () => void; busy: boolean; count: number | null; recall?: number | null;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 min-h-[280px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${accent}`}>{icon}</div>
          <div className="font-display text-lg">{title}</div>
        </div>
        <Button size="sm" variant="secondary" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run"}
        </Button>
      </div>
      {count !== null && (
        <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-memory">
          ◆ {count} Postgres rows{typeof recall === "number" ? ` · 🧠 ${recall} Hindsight recalls` : ""}
        </div>
      )}
      <div className="mt-4 flex-1 text-sm">{children}</div>
    </div>
  );
}

function AnalyzeCard() {
  const fn = useServerFn(analyzePerformance);
  const m = useMutation({ mutationFn: () => fn(), onError: (e) => toast.error(e.message) });
  const r = m.data;
  return (
    <InsightShell
      title="Performance" icon={<TrendingUp className="h-4 w-4 text-primary-foreground" />}
      accent="bg-primary" run={() => m.mutate()} busy={m.isPending}
      count={r && !r.empty ? r.memoryCount : null} recall={r && !r.empty ? r.hindsightRecall ?? null : null}
    >
      {!r && <EmptyHint />}
      {r?.empty && <p className="text-muted-foreground">Add content to memory first.</p>}
      {r && !r.empty && r.error && <p className="text-xs text-destructive">{r.error}</p>}
      {r && !r.empty && r.analysis && (
        <div className="space-y-3">
          <p className="font-display text-base leading-snug text-foreground">{r.analysis.headline}</p>
          <Kv k="Best topic" v={r.analysis.best_topic.name} note={r.analysis.best_topic.reason} />
          <Kv k="Best platform" v={r.analysis.best_platform.name} note={r.analysis.best_platform.reason} />
          <Kv k="Best format" v={r.analysis.best_format.name} note={r.analysis.best_format.reason} />
          <ul className="mt-2 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {r.analysis.patterns.map((p, i) => <li key={i}>· {p}</li>)}
          </ul>
        </div>
      )}

    </InsightShell>
  );
}

function RecommendCard() {
  const fn = useServerFn(recommendContent);
  const m = useMutation({ mutationFn: () => fn(), onError: (e) => toast.error(e.message) });
  const r = m.data;
  return (
    <InsightShell
      title="Recommendations" icon={<Lightbulb className="h-4 w-4 text-accent-foreground" />}
      accent="bg-accent" run={() => m.mutate()} busy={m.isPending}
      count={r && !r.empty ? r.memoryCount : null} recall={r && !r.empty ? r.hindsightRecall ?? null : null}
    >
      {!r && <EmptyHint />}
      {r?.empty && <p className="text-muted-foreground">Add content to memory first.</p>}
      {r && !r.empty && r.error && <p className="text-xs text-destructive">{r.error}</p>}
      {r && !r.empty && r.recommendations && (
        <div className="space-y-3">
          <p className="text-xs italic text-muted-foreground">{r.recommendations.rationale}</p>
          <ul className="space-y-2">
            {r.recommendations.ideas.map((i, idx) => (
              <li key={idx} className="rounded-md border border-border bg-background/40 p-3">
                <div className="font-display text-sm">{i.title}</div>
                <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="rounded bg-secondary px-1.5 py-0.5">{i.platform}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5">{i.format}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5">{i.topic}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{i.why}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </InsightShell>
  );
}

function GapsCard() {
  const fn = useServerFn(findContentGaps);
  const m = useMutation({ mutationFn: () => fn(), onError: (e) => toast.error(e.message) });
  const r = m.data;
  return (
    <InsightShell
      title="Content Gaps" icon={<Target className="h-4 w-4 text-background" />}
      accent="bg-memory" run={() => m.mutate()} busy={m.isPending}
      count={r && !r.empty ? r.memoryCount : null} recall={r && !r.empty ? r.hindsightRecall ?? null : null}
    >
      {!r && <EmptyHint />}
      {r?.empty && <p className="text-muted-foreground">Add content to memory first.</p>}
      {r && !r.empty && r.error && <p className="text-xs text-destructive">{r.error}</p>}
      {r && !r.empty && r.gaps && (
        <div className="space-y-3">
          <p className="text-xs italic text-muted-foreground">{r.gaps.summary}</p>
          <ul className="space-y-2">
            {r.gaps.gaps.map((g, idx) => (
              <li key={idx} className="rounded-md border border-border bg-background/40 p-3">
                <div className="font-display text-sm">{g.area}</div>
                <div className="mt-1 text-xs text-muted-foreground">{g.evidence}</div>
                <div className="mt-2 text-xs text-foreground">→ {g.opportunity}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </InsightShell>
  );
}

function Kv({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="font-display text-base">{v}</div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
      Press <span className="mx-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">Run</span> to analyze memory
    </div>
  );
}

function RecentMemory() {
  const fn = useServerFn(listContent);
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteContent);
  const { data } = useQuery({ queryKey: ["memory"], queryFn: () => fn() });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed from memory"); qc.invalidateQueries(); },
  });
  const rows = data?.slice(0, 8) ?? [];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <Database className="h-3.5 w-3.5 text-memory" /> Recent memories
        </div>
        <div className="text-xs text-muted-foreground">{data?.length ?? 0} total</div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No memories yet. Load demo data or add content above.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm">{r.title}</div>
                <div className="mt-0.5 flex gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{r.platform}</span>·<span>{r.topic}</span>·<span>{r.content_type}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular-nums text-signal">{r.engagement_score}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">engagement</div>
              </div>
              <button onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
