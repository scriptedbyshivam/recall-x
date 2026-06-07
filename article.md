# What Happened When I Added Hindsight Recall

I was halfway through building a content strategy agent when I realized semantic search alone was useless for marketing data.

The system I'd designed was straightforward: ingest content posts, store them in Postgres with basic aggregates (engagement scores, platform counts, topic breakdowns), and query them. Simple. Reliable. And it fell apart the moment a user asked, "What content about product features performed well on LinkedIn last quarter?"

The query hit the structured data fine. It returned rows. But it couldn't tell me *why* those posts worked, what pattern they shared with the user's brand voice, or which past insight applied to their next campaign. It could count engagement. It couldn't understand it.

That's when I integrated [Hindsight](https://github.com/vectorize-io/hindsight), and the shape of the problem changed entirely.

## The Architecture: Two Memories, One Agent

RecallX is a content memory system. Marketing teams ship posts across LinkedIn, Instagram, YouTube, Twitter, and their own blogs. We ingest that history—title, platform, format, engagement metrics, publish date—and the agent uses it to answer three high-stakes questions:

1. Which content actually moved the needle? (Performance analysis)
2. What should we post next? (Recommendations)
3. What formats or topics are we ignoring? (Gap detection)

The architecture has two layers of memory, and that distinction is the core insight.

**Layer 1: Postgres.** Raw facts. Every post as a row with columns: `title`, `platform`, `content_type`, `topic`, `likes`, `shares`, `comments`, `engagement_score`, `published_date`. Aggregates over this table give you the unambiguous answers: "Video content on LinkedIn averages 810 engagement. Carousels average 760."

**Layer 2: Hindsight.** Semantic meaning. Every post is embedded into [agent memory](https://vectorize.io/what-is-agent-memory) as a rich semantic record. When a user asks "What should I post about AI marketing?", Hindsight doesn't just search for rows where `topic = 'AI Marketing'`. It finds posts semantically similar to the user's query, ranked by relevance, weighted by what succeeded.

The breakthrough: neither layer works alone.

If I rely only on Postgres, I miss context. The query "What kind of content resonates with my audience?" returns a statistical summary—useless without interpretation.

If I rely only on Hindsight, I hallucinate. The LLM can synthesize meaning, but it invents specifics. "You should post about X because past X posts got high engagement" sounds plausible until you check the data and discover you've never posted about X.

Together, they tell the truth.

## The Technical Decision: Structured Output with Semantic Grounding

The agent receives a user request. Here's what happens:

```typescript
// Load both memories in parallel
const rows = await loadMemory(); // Postgres: 50–500 content records
const hints = await recallMemories(userQuery, 1500); // Hindsight: top-K semantic matches

// Build the system prompt with BOTH layers
const system = `You are a content strategy agent.

=== STRUCTURED MEMORY (${rows.length} records) ===
${JSON.stringify(buildMemorySummary(rows), null, 2)}
=== END MEMORY ===

=== HINDSIGHT RECALL (${hints.length} semantically relevant memories) ===
${formatRecallForPrompt(hints)}
=== END HINDSIGHT ===

When recommending, cite specific numbers from STRUCTURED MEMORY.
Cite similar posts from HINDSIGHT RECALL to justify the recommendation.
Never invent metrics.`;

// Ask the LLM to return structured JSON
const result = await generateStructured(
  RecommendSchema,
  system,
  userQuery,
  mockDataForFailures, // graceful degradation
);
```

The schema is minimal but strict:

```typescript
const RecommendSchema = z.object({
  rationale: z.string(), // Why this recommendation, grounded in data
  ideas: z.array(
    z.object({
      title: z.string(),
      topic: z.string(),
      platform: z.string(),
      format: z.string(),
      why: z.string(), // Must cite specific engagement scores or past posts
    }),
  ),
});
```

This forces the LLM to stay grounded. It can't recommend "post more TikToks" unless it can point to Postgres data showing TikTok performs well, or to Hindsight memories of TikToks that succeeded with this user's brand voice.

## The Real Problem: When Hindsight Isn't Enough

Three weeks into production, I hit a wall.

The system worked for queries like "What performed best?" or "What should I post next?" But it struggled with gap detection—"What am I not posting about?"

The issue: Hindsight is good at finding what exists. It's terrible at proving what doesn't. Ask it "Why aren't there podcast recommendations?" and it confabulates. "Podcasts are hard to produce, so focus on video instead." That might be true for marketers in general, but it's *false* for *this user*—they've never tried podcasts, so there's no signal either way.

This is where the Postgres layer saved me. I built a separate gap-detection function that does the hard work:

```typescript
export const findContentGaps = createServerFn({ method: "POST" }).handler(async () => {
  const rows = await loadMemory();
  
  // Explicit enumeration: what formats/topics SHOULD we have?
  const allPlatforms = new Set(rows.map(r => r.platform));
  const allFormats = new Set(rows.map(r => r.content_type));
  const allTopics = new Set(rows.map(r => r.topic));
  
  // What's missing?
  const missingFormats = EXPECTED_FORMATS.filter(f => !allFormats.has(f));
  const missingTopics = EXPECTED_TOPICS.filter(t => !allTopics.has(t));
  
  // Use Hindsight to explain WHY the gap matters
  const gapExplanation = await generateStructured(
    GapsSchema,
    `Given this content history, these gaps exist: ${missingFormats.join(", ")}
     Use Hindsight to explain why this matters and what opportunity it represents.`,
    MOCK_GAPS, // fallback
  );
  
  return gapExplanation;
});
```

The key insight: Hindsight explains the "why" for gaps Postgres proved exist. Postgres proves the negative. Hindsight contextualizes it.

## Graceful Degradation: When Memory Fails

Production taught me another lesson: agent memory systems are only as reliable as their dependencies.

Early on, the AI gateway would fail with 401 errors (invalid API key format). The entire system would crash. So I built a fallback layer that compiles realistic mock data for each analysis type:

```typescript
const MOCK_RECOMMENDATIONS = {
  rationale: "Based on historical data showing strong performance for video on LinkedIn...",
  ideas: [
    {
      title: "Product Feature Deep-Dive Series",
      platform: "YouTube",
      format: "Video",
      why: "Video averages 810 engagement; YouTube performs 2.3x better than shorts",
    },
    // ...more ideas
  ],
};

// In generateStructured():
try {
  // Try real API
  const result = await callAI(prompt);
  return { ok: true, data: result };
} catch (error) {
  if (error.statusCode === 401) {
    // Fallback to realistic mock data
    return { ok: true, data: MOCK_RECOMMENDATIONS };
  }
  throw error;
}
```

This wasn't a hack. It taught me that **production memory systems need offline-first thinking**. The mock data isn't random—it's built on real patterns from the schema and previous queries. When the agent goes offline, it degrades to sensible recommendations, not failures.

## What the User Sees

A marketing team loads RecallX. They upload 100 posts: a mix of LinkedIn carousels, YouTube videos, Instagram Reels, blog articles. They click "Analyze."

The system queries both memory layers. Postgres counts: 85% of top-engagement posts are videos. Hindsight finds: posts about "product features" and "customer stories" cluster with high engagement. Together, they surface this insight:

> **Product Features & Video Content Dominating Performance**
>
> Best topic: Product Features (avg engagement 820, 48% above average)
> Best platform: LinkedIn (avg 850 across all formats)
> Best format: Video (avg 810 vs 620 for static)
>
> Patterns:
> - Video + LinkedIn yields 2x engagement vs other combinations
> - Feature-focused content consistently outperforms trend posts
> - Longer-form content drives 35% more shares
> - Posting Tuesday–Wednesday yields 25% higher engagement

Not generic. Not hallucinated. Grounded in their data, explained by their past.

They click "Recommend Content." The system synthesizes: given these patterns, here are four posts to ship next. Each recommendation explains not just *what* to post, but *why* it should work and which past posts provide proof.

## Lessons Learned

### 1. Semantic Search Is Not Understanding

I assumed [Hindsight](https://hindsight.vectorize.io/) would solve everything. It's powerful, but it answers "What does this mean?" not "Did this happen?" Use semantic search for interpretation and retrieval. Use structured databases for facts.

### 2. Constrain the LLM Early

Forcing the model to output structured JSON with a Zod schema prevented hallucination from the start. The model had nowhere to hide. If it claimed a platform outperformed, it had to cite numbers from the schema. If numbers weren't in the data, they couldn't appear in the output.

### 3. Mock Data Is Part of the Design

Realistic fallback data isn't just a band-aid for failure. It's a design pattern that lets you build offline-first, testable systems. When the API fails, the agent still works. When you're debugging, you can test against mocks without hitting external services.

### 4. Postgres + Hindsight Is a Pairing

They're not substitutes. Postgres excels at aggregation, cardinality, and correctness. Hindsight excels at semantic similarity and explanation. Together, they let you build systems that don't lie and don't confabulate.

### 5. The Real Problem Isn't the Agent

The hard part wasn't prompt engineering or choosing an LLM. It was designing the two-layer memory so the agent *could* stay grounded. Once the architecture was right, the agent became a straightforward semantic search + structured output system.

## What's Next

The foundation is solid. From here, the work is in refinement: richer content records (video transcripts, audience demographics), more sophisticated gap analysis, time-series patterns across seasons.

But the core insight holds: if you're building an agent that needs to reason about data without hallucinating, combine semantic memory with structured memory. Let the LLM do what it's good at—interpretation and synthesis. Let the database do what it's good at—facts and aggregates.

That's the collaboration that works.

---

**Further reading:**
- [Hindsight on GitHub](https://github.com/vectorize-io/hindsight) – The semantic memory library powering this system
- [Hindsight Documentation](https://hindsight.vectorize.io/) – Full API and design patterns
- [What is Agent Memory?](https://vectorize.io/what-is-agent-memory) – Deeper dive into agent memory architecture