import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

type Row = {
  id: string;
  title: string;
  platform: string;
  topic: string;
  content_type: string;
  likes: number;
  shares: number;
  comments: number;
  engagement_score: number;
  published_date: string | null;
};

async function loadMemory(): Promise<Row[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("content_memory")
    .select("*")
    .order("engagement_score", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function aggregate(rows: Row[]) {
  const byKey = (key: "topic" | "platform" | "content_type") => {
    const map = new Map<string, { count: number; total: number; max: number }>();
    for (const r of rows) {
      const k = r[key];
      const entry = map.get(k) ?? { count: 0, total: 0, max: 0 };
      entry.count += 1;
      entry.total += r.engagement_score;
      entry.max = Math.max(entry.max, r.engagement_score);
      map.set(k, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, avg: Math.round(v.total / v.count), total: v.total, max: v.max }))
      .sort((a, b) => b.avg - a.avg);
  };
  return {
    total: rows.length,
    topics: byKey("topic"),
    platforms: byKey("platform"),
    formats: byKey("content_type"),
    topPosts: rows.slice(0, 5).map((r) => ({
      title: r.title,
      platform: r.platform,
      topic: r.topic,
      type: r.content_type,
      engagement: r.engagement_score,
    })),
  };
}

function buildMemorySummary(rows: Row[]) {
  return JSON.stringify(aggregate(rows), null, 2);
}

async function getGateway() {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key)
    throw new Error(
      "AI_GATEWAY_API_KEY is not configured. Create a .env file or set AI_GATEWAY_API_KEY in your environment. See .env.example for required vars.",
    );
  const { createAiGatewayProvider } = await import("./ai-gateway.server");
  return createAiGatewayProvider(key);
}

// Use the more reliable structured-output model for these calls.
// gemini-3-flash-preview is great for streaming chat but flaky with Output.object.
const STRUCTURED_MODEL = "google/gemini-2.5-flash";

async function buildHindsightBlock(query: string) {
  try {
    const { recallMemories, formatRecallForPrompt, hindsightConfigured } = await import("./hindsight.server");
    if (!hindsightConfigured()) return { block: "", count: 0 };
    const hits = await recallMemories(query, 1000);
    return {
      block: `\n\n=== HINDSIGHT RECALL (${hits.length} relevant memories) ===\n${formatRecallForPrompt(hits)}\n=== END RECALL ===`,
      count: hits.length,
    };
  } catch (e) {
    console.error("[analysis] hindsight recall failed:", e);
    return { block: "", count: 0 };
  }
}

/** Strip markdown fences and extract the first balanced JSON object/array from a string. */
function extractJson(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[{[]/);
  if (start === -1) throw new Error("No JSON found in model output");
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end === -1 || end < start) throw new Error("Unbalanced JSON in model output");
  s = s.substring(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(s);
  }
}

/**
 * Try structured output first; if Gemini fails the schema, fall back to a
 * plain prompt + manual JSON extraction. Never throws — returns { error } on full failure.
 */
async function generateStructured<T>(
  schema: z.ZodType<T>,
  prompt: string,
  jsonShapeHint: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const gateway = await getGateway();
  // Attempt 1: constrained decoding
  try {
    const { experimental_output } = await generateText({
      model: gateway(STRUCTURED_MODEL),
      experimental_output: Output.object({ schema }),
      prompt,
    });
    return { ok: true, data: experimental_output as T };
  } catch (e) {
    console.warn("[analysis] structured output failed, falling back to JSON-prompt:", (e as Error).message);
  }
  // Attempt 2: plain prompt, parse JSON manually
  try {
    const { text } = await generateText({
      model: gateway(STRUCTURED_MODEL),
      prompt: `${prompt}\n\nReturn ONLY valid JSON matching this exact shape, no markdown, no commentary:\n${jsonShapeHint}`,
    });
    const parsed = extractJson(text);
    const validated = schema.safeParse(parsed);
    if (validated.success) return { ok: true, data: validated.data };
    // last resort: return parsed even if some fields wrong, casted
    return { ok: true, data: parsed as T };
  } catch (e) {
    return { ok: false, error: `AI failed to produce a valid response: ${(e as Error).message}` };
  }
}

// ---------- Schemas (kept FLAT and minimal — no .describe / .min / .max) ----------

const PerformanceSchema = z.object({
  headline: z.string(),
  best_topic: z.object({ name: z.string(), reason: z.string() }),
  best_platform: z.object({ name: z.string(), reason: z.string() }),
  best_format: z.object({ name: z.string(), reason: z.string() }),
  patterns: z.array(z.string()),
});

const RecommendSchema = z.object({
  rationale: z.string(),
  ideas: z.array(
    z.object({
      title: z.string(),
      topic: z.string(),
      platform: z.string(),
      format: z.string(),
      why: z.string(),
    }),
  ),
});

const GapsSchema = z.object({
  summary: z.string(),
  gaps: z.array(
    z.object({
      area: z.string(),
      evidence: z.string(),
      opportunity: z.string(),
    }),
  ),
});

// ---------- Server functions ----------

export const analyzePerformance = createServerFn({ method: "POST" }).handler(async () => {
  const rows = await loadMemory();
  if (rows.length === 0) return { empty: true as const };
  const summary = buildMemorySummary(rows);
  const recall = await buildHindsightBlock("Which past posts performed best and what patterns explain why?");
  const result = await generateStructured(
    PerformanceSchema,
    `You are a marketing analyst using HINDSIGHT MEMORY. Analyze this aggregated content memory and return concise, number-citing insights. Reference engagement_score and topic/platform/format names from the data. Give 3-5 patterns.\n\nMEMORY (aggregates from Postgres):\n${summary}${recall.block}`,
    `{
  "headline": "string",
  "best_topic": { "name": "string", "reason": "string" },
  "best_platform": { "name": "string", "reason": "string" },
  "best_format": { "name": "string", "reason": "string" },
  "patterns": ["string", "string", "string"]
}`,
  );
  if (!result.ok) return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, error: result.error };
  return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, analysis: result.data };
});

export const recommendContent = createServerFn({ method: "POST" }).handler(async () => {
  const rows = await loadMemory();
  if (rows.length === 0) return { empty: true as const };
  const summary = buildMemorySummary(rows);
  const recall = await buildHindsightBlock("What kinds of content historically performed best for this team?");
  const result = await generateStructured(
    RecommendSchema,
    `Based on HINDSIGHT MEMORY, recommend the next 3-5 pieces of content. Each must justify itself using actual numbers from the data. Prefer combinations of topic+platform+format that historically outperformed.\n\nMEMORY:\n${summary}${recall.block}`,
    `{
  "rationale": "string",
  "ideas": [
    { "title": "string", "topic": "string", "platform": "string", "format": "string", "why": "string" }
  ]
}`,
  );
  if (!result.ok) return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, error: result.error };
  return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, recommendations: result.data };
});

export const findContentGaps = createServerFn({ method: "POST" }).handler(async () => {
  const rows = await loadMemory();
  if (rows.length === 0) return { empty: true as const };
  const summary = buildMemorySummary(rows);
  const recall = await buildHindsightBlock("What topics or formats are underrepresented or missing from past content?");
  const result = await generateStructured(
    GapsSchema,
    `Inspect HINDSIGHT MEMORY and identify 3-6 gaps: missing topics, underrepresented platforms, untapped formats, audience interests hinted at by high-engagement posts but not yet expanded on. Cite evidence from the data.\n\nMEMORY:\n${summary}${recall.block}`,
    `{
  "summary": "string",
  "gaps": [
    { "area": "string", "evidence": "string", "opportunity": "string" }
  ]
}`,
  );
  if (!result.ok) return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, error: result.error };
  return { empty: false as const, memoryCount: rows.length, hindsightRecall: recall.count, gaps: result.data };
});

export const getMemorySummary = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await loadMemory();
  const { hindsightConfigured } = await import("./hindsight.server");
  return { count: rows.length, aggregates: aggregate(rows), hindsightConfigured: hindsightConfigured() };
});

// ---------- Platform recommender (post text -> best social platform) ----------

const PlatformRecSchema = z.object({
  best_platform: z.string(),
  confidence: z.number(),
  reason: z.string(),
  alternates: z.array(z.object({ platform: z.string(), why: z.string() })),
  optimized_caption: z.string(),
  hashtags: z.array(z.string()),
  best_time: z.string(),
});

export const recommendPlatform = createServerFn({ method: "POST" })
  .validator(z.object({ postIdea: z.string().min(1) }))
  .handler(async ({ data }) => {
    const rows = await loadMemory();
    const summary = rows.length ? buildMemorySummary(rows) : "(no memory yet — base recommendation on general best practices)";
    const recall = await buildHindsightBlock(`Which platform fits this post: ${data.postIdea}`);
    const result = await generateStructured(
      PlatformRecSchema,
      `You are a social media strategist. Given a POST IDEA, recommend the single best social platform for it AND craft an optimized caption.

POST IDEA:
"""${data.postIdea}"""

USER'S HISTORICAL MEMORY (use to bias recommendation when relevant):
${summary}${recall.block}

Choose from: LinkedIn, Instagram, Twitter, TikTok, YouTube, Blog, Threads, Reddit.
Confidence is 0-1. Return 2 alternates with reasons. Caption should match platform tone. Suggest 3-6 hashtags. Best time is a human string like "Tue 9-11am IST".`,
      `{
  "best_platform": "string",
  "confidence": 0.0,
  "reason": "string",
  "alternates": [{ "platform": "string", "why": "string" }],
  "optimized_caption": "string",
  "hashtags": ["string"],
  "best_time": "string"
}`,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, memoryCount: rows.length, hindsightRecall: recall.count, rec: result.data };
  });
