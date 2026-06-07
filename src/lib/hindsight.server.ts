// Hindsight Memory client (server-only).
// Docs: https://hindsight.vectorize.io/  | API: /v1/default/banks/{bank_id}/...

type MemoryItem = {
  content: string;
  context?: string;
  document_id?: string;
  tags?: string[];
  timestamp?: string;
};

type RecallHit = {
  id?: string;
  content?: string;
  text?: string;
  score?: number;
  context?: string;
  document_id?: string;
  timestamp?: string;
  [k: string]: unknown;
};

function getConfig() {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const bankId = process.env.HINDSIGHT_BANK_ID;
  const baseUrl = (process.env.HINDSIGHT_BASE_URL || "https://hindsight.vectorize.io").replace(/\/$/, "");
  if (!apiKey || !bankId) return null;
  return { apiKey, bankId, baseUrl };
}

export function hindsightConfigured() {
  return getConfig() !== null;
}

async function call(path: string, init: RequestInit) {
  const cfg = getConfig();
  if (!cfg) throw new Error("Hindsight not configured (HINDSIGHT_API_KEY / HINDSIGHT_BANK_ID missing)");
  const url = `${cfg.baseUrl}/v1/default/banks/${encodeURIComponent(cfg.bankId)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hindsight ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Ensure the memory bank exists (idempotent). Safe to call repeatedly. */
export async function ensureBank() {
  const cfg = getConfig();
  if (!cfg) return;
  try {
    const url = `${cfg.baseUrl}/v1/default/banks/${encodeURIComponent(cfg.bankId)}`;
    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ name: "Content Strategy Memory" }),
    });
  } catch {
    /* non-fatal */
  }
}

/** Store one or many memories (retain). Returns silently on failure (demo safety). */
export async function ingestMemories(items: MemoryItem[]): Promise<{ ok: boolean; error?: string }> {
  if (!hindsightConfigured()) return { ok: false, error: "not_configured" };
  if (items.length === 0) return { ok: true };
  try {
    await ensureBank();
    await call("/memories", {
      method: "POST",
      body: JSON.stringify({ items, async: false }),
    });
    return { ok: true };
  } catch (e) {
    console.error("[hindsight] ingest failed:", e);
    return { ok: false, error: (e as Error).message };
  }
}

/** Semantic recall. Returns top-K relevant past memories. Never throws. */
export async function recallMemories(query: string, maxTokens = 1500): Promise<RecallHit[]> {
  if (!hindsightConfigured()) return [];
  try {
    const out = (await call("/memories/recall", {
      method: "POST",
      body: JSON.stringify({ query, max_tokens: maxTokens, budget: "mid" }),
    })) as { results?: RecallHit[] };
    return out?.results ?? [];
  } catch (e) {
    console.error("[hindsight] recall failed:", e);
    return [];
  }
}

/** Wipe all memories in this bank. */
export async function clearBankMemories(): Promise<{ ok: boolean }> {
  if (!hindsightConfigured()) return { ok: false };
  try {
    await call("/memories", { method: "DELETE" });
    return { ok: true };
  } catch (e) {
    console.error("[hindsight] clear failed:", e);
    return { ok: false };
  }
}

/** Convert a content row to a memory item. */
export function rowToMemoryItem(row: {
  id?: string;
  title: string;
  platform: string;
  topic: string;
  content_type: string;
  likes: number;
  shares: number;
  comments: number;
  engagement_score?: number;
  published_date?: string | null;
}): MemoryItem {
  const eng = row.engagement_score ?? row.likes + row.shares * 2 + row.comments * 3;
  const content = `Post "${row.title}" was published on ${row.platform} as a ${row.content_type} about ${row.topic}. It got ${row.likes} likes, ${row.shares} shares, ${row.comments} comments (engagement score ${eng}).`;
  return {
    content,
    context: `marketing-content/${row.topic}/${row.platform}`,
    document_id: row.id ?? `${row.platform}-${row.title}`.slice(0, 80),
    tags: [row.topic, row.platform, row.content_type],
    timestamp: row.published_date ? `${row.published_date}T12:00:00Z` : undefined,
  };
}

/** Format recall hits as a prompt-injectable block. */
export function formatRecallForPrompt(hits: RecallHit[]) {
  if (hits.length === 0) return "(no Hindsight recall hits)";
  return hits
    .map((h, i) => {
      const txt = h.content || h.text || JSON.stringify(h);
      const score = typeof h.score === "number" ? ` (score ${h.score.toFixed(2)})` : "";
      return `${i + 1}.${score} ${txt}`;
    })
    .join("\n");
}
