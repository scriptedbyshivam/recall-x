import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContentInput = z.object({
  title: z.string().min(1).max(300),
  platform: z.string().min(1).max(50),
  topic: z.string().min(1).max(100),
  content_type: z.string().min(1).max(50),
  likes: z.number().int().min(0).max(10_000_000),
  shares: z.number().int().min(0).max(10_000_000),
  comments: z.number().int().min(0).max(10_000_000),
  published_date: z.string().optional().nullable(),
});

export type ContentInputT = z.infer<typeof ContentInput>;

export const listContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("content_memory")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addContent = createServerFn({ method: "POST" })
  .validator(ContentInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("content_memory")
      .insert({ ...data, published_date: data.published_date || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { ingestMemories, rowToMemoryItem } = await import("./hindsight.server");
    const hs = await ingestMemories([rowToMemoryItem(inserted as never)]);
    return { ok: true, hindsight: hs };
  });

export const bulkAddContent = createServerFn({ method: "POST" })
  .validator(z.object({ items: z.array(ContentInput).min(1).max(500) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.items.map((it) => ({ ...it, published_date: it.published_date || null }));
    const { data: inserted, error } = await supabaseAdmin.from("content_memory").insert(rows).select();
    if (error) throw new Error(error.message);
    const { ingestMemories, rowToMemoryItem } = await import("./hindsight.server");
    const hs = await ingestMemories((inserted ?? []).map((r) => rowToMemoryItem(r as never)));
    return { ok: true, inserted: rows.length, hindsight: hs };
  });

export const deleteContent = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("content_memory").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMemory = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("content_memory").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
  const { clearBankMemories } = await import("./hindsight.server");
  await clearBankMemories();
  return { ok: true };
});

const SEED: ContentInputT[] = [
  { title: "Top 5 AI Marketing Tools in 2025", platform: "LinkedIn", topic: "AI Marketing", content_type: "Carousel", likes: 520, shares: 85, comments: 30, published_date: "2025-09-12" },
  { title: "How GPT changed our content workflow", platform: "LinkedIn", topic: "AI Marketing", content_type: "Article", likes: 410, shares: 60, comments: 42, published_date: "2025-09-22" },
  { title: "Behind the scenes: building an AI agent", platform: "LinkedIn", topic: "AI Marketing", content_type: "Carousel", likes: 690, shares: 110, comments: 51, published_date: "2025-10-04" },
  { title: "SEO in 2025: what still works", platform: "LinkedIn", topic: "SEO", content_type: "Article", likes: 120, shares: 18, comments: 9, published_date: "2025-08-30" },
  { title: "10 SEO myths debunked", platform: "Blog", topic: "SEO", content_type: "Long-form", likes: 95, shares: 22, comments: 14, published_date: "2025-08-14" },
  { title: "Quick SEO checklist for new sites", platform: "Twitter", topic: "SEO", content_type: "Thread", likes: 240, shares: 70, comments: 18, published_date: "2025-09-02" },
  { title: "Instagram Reels growth hacks", platform: "Instagram", topic: "Social Growth", content_type: "Reel", likes: 1850, shares: 320, comments: 140, published_date: "2025-09-18" },
  { title: "From 0 to 10k followers in 60 days", platform: "Instagram", topic: "Social Growth", content_type: "Reel", likes: 2210, shares: 410, comments: 192, published_date: "2025-10-09" },
  { title: "Content calendar template", platform: "Instagram", topic: "Productivity", content_type: "Carousel", likes: 540, shares: 95, comments: 35, published_date: "2025-09-25" },
  { title: "Why your email open rates are dropping", platform: "Blog", topic: "Email Marketing", content_type: "Long-form", likes: 180, shares: 30, comments: 22, published_date: "2025-08-21" },
  { title: "Cold email frameworks that convert", platform: "LinkedIn", topic: "Email Marketing", content_type: "Carousel", likes: 470, shares: 88, comments: 26, published_date: "2025-10-01" },
  { title: "AI prompts every marketer should steal", platform: "Twitter", topic: "AI Marketing", content_type: "Thread", likes: 980, shares: 260, comments: 64, published_date: "2025-10-14" },
  { title: "Brand voice in the age of AI", platform: "LinkedIn", topic: "Branding", content_type: "Article", likes: 215, shares: 40, comments: 18, published_date: "2025-09-08" },
  { title: "How we redesigned our landing page", platform: "Blog", topic: "CRO", content_type: "Case study", likes: 320, shares: 55, comments: 28, published_date: "2025-09-30" },
  { title: "The marketing stack we use in 2025", platform: "LinkedIn", topic: "Productivity", content_type: "Carousel", likes: 605, shares: 120, comments: 38, published_date: "2025-10-20" },
];

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = SEED.map((it) => ({ ...it, published_date: it.published_date || null }));
  const { data: inserted, error } = await supabaseAdmin.from("content_memory").insert(rows).select();
  if (error) throw new Error(error.message);
  const { ingestMemories, rowToMemoryItem } = await import("./hindsight.server");
  const hs = await ingestMemories((inserted ?? []).map((r) => rowToMemoryItem(r as never)));
  return { ok: true, inserted: rows.length, hindsight: hs };
});
