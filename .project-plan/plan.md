# Bug Fix + Project Walkthrough

## Part 1 — Bug: "No object generated: response did not match schema"

### Kya ho raha hai (root cause)

`src/lib/analysis.ts` me teeno functions (`analyzePerformance`, `recommendContent`, `findContentGaps`) AI SDK ke `Output.object({ schema })` ka use karte hain. Yeh Gemini ko strict JSON schema ke andar response generate karne pe force karta hai (constrained decoding).

Do problems hain:

1. **`google/gemini-3-flash-preview`** ke saath `Output.object` aksar fail karta hai jab schema me `.describe()` strings + `.min()/.max()` constraints + nested arrays of objects ho — Gemini "too many states" ya empty output return karta hai, aur AI SDK throw karta hai `No object generated: response did not match schema`.
2. Koi **error handling nahi** hai — agar Gemini ek bhi field miss kare to poora server function 500 de deta hai, UI me bas error dikhta hai.

Hindsight recall block bhi prompt me inject ho raha hai, jo input length badhata hai aur structured output ko aur unstable banata hai.

### Fix (chhota, surgical)

`src/lib/analysis.ts` me:

1. **Schema simplify**: `.describe()` aur `.min()/.max()` hata do (rules prompt me bhej do, schema me sirf shape rakho).
2. **Model swap to a more reliable structured-output model** for these 3 calls: `google/gemini-2.5-flash` (Gemini 3 flash preview structured output flaky hai; 2.5-flash hamesha kaam karta hai). Chat streaming wahi 3-flash-preview pe rahega.
3. **Try/catch wrapper**: agar structured generation fail ho to fallback — same prompt without `Output.object`, fir manually JSON extract karke parse (markdown fences strip, brace-matching). Failure pe user-friendly `{ error: "..." }` return.
4. **Truncation guard**: agar response truncate ho to clear message return karo instead of crash.

Koi UI change nahi — `src/routes/index.tsx` already `empty` aur data dono handle karta hai, bas error case ke liye chhota toast/inline message add karenge.

### Files to change

- `src/lib/analysis.ts` — schema simplify + model swap + try/catch + JSON fallback parser
- `src/routes/index.tsx` — chhota error state for the 3 insight cards (toast pe show karenge agar `result.error`)

---

## Part 2 — Project Walkthrough (jaisa maanga)

### Simple tarike se (random user ke liye)

Yeh ek **Content Strategy AI Agent** hai jo aapki marketing team ke purane social posts yaad rakhta hai aur unke basis pe advice deta hai.

1. **Aap content add karte ho** (manually ya CSV upload, ya "Load demo data" button) — har post ka title, platform (Instagram/LinkedIn/etc), topic, type, aur likes/shares/comments.
2. App ye data **do jagah save karta hai**:
   - **Postgres database** (Supabase) — exact numbers, dates, rows.
   - **Hindsight Memory** (semantic memory service) — "matlab" yaad rakhta hai, taaki future me aap kuch bhi puchho to relevant purane posts dhundh sake.
3. **AI insights** (3 buttons on dashboard):
   - **Analyze Performance** — kya best chala aur kyu.
   - **Recommend Content** — agla kya banao.
   - **Find Content Gaps** — kya topics/formats miss ho rahe hain.
4. **Chat page** — aap free-form sawaal pooch sakte ho. Memory toggle ON ho to AI aapke purane data ke specific numbers cite karta hai.

### Professional tech explanation (banane wale ke nazar se)

**Stack:**
- **TanStack Start** (React + Vite, SSR + server functions)
- **Supabase** = Postgres + Auth + Storage
- **AI Gateway** = Gemini models via OpenAI-compatible API
- **Hindsight (Vectorize.io)** = semantic memory bank (vector recall)
- **AI SDK (Vercel)** for `generateText` / `streamText` / `Output.object`

**Architecture (hybrid memory — yeh hackathon ka USP hai):**

```text
Add content ─┬─► Postgres (content_memory table: structured row)
             └─► Hindsight bank (semantic memory: "Post X on LinkedIn about AI got 450 engagement")

Ask AI ──► 1. Postgres se aggregates (top topics, avg engagement per platform)
           2. Hindsight se semantic recall (user ke sawaal se related purane posts)
           3. Dono ko ek prompt me combine karke Gemini ko bhejte hain
           4. Gemini structured/streaming response
           5. (chat) response wapas Hindsight me save — agent time ke saath smarter
```

**Files map:**
- `src/integrations/supabase/*` — DB clients (browser, admin, auth middleware)
- `src/lib/content.ts` — `addContent`, `bulkAddContent`, `seedDemoData`, `clearMemory` (dual-write to Postgres + Hindsight)
- `src/lib/hindsight.server.ts` — Hindsight client: `ingestMemories`, `recallMemories`, `clearBankMemories`
- `src/lib/analysis.ts` — 3 AI insight serverFns (Postgres aggregates + Hindsight recall + Gemini structured output)
- `src/routes/api/chat.ts` — streaming chat route (Postgres rows + Hindsight recall injected as system prompt)
- `src/routes/index.tsx` — dashboard UI (add form, CSV import, insight cards, memory stats)
- `src/routes/chat.tsx` — chat UI with Memory ON/OFF toggle

**Hackathon mandatory ticks:**
- ✅ Hindsight integrated (bank API, Bearer auth, recall+ingest+clear)
- ✅ Memory makes agent smarter (chat saves back into Hindsight)
- ✅ Demo-safe (Hindsight fail ho to Postgres-only fallback, app crash nahi karta)

---

## Out of scope

- UI redesign
- Adding auth (currently public RLS — demo only)
- Changing Hindsight schema or bank structure
- Switching providers

Confirm karo to build mode me jaake fix implement karta hoon.
