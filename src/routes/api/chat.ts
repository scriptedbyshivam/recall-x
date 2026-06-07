import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[]; useMemory?: boolean };
        const messages = body.messages;
        const useMemory = body.useMemory !== false;
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.AI_GATEWAY_API_KEY;
        if (!key)
          return new Response(
            "Missing AI_GATEWAY_API_KEY. Set AI_GATEWAY_API_KEY in environment (see .env.example)",
            { status: 500 },
          );

        let memoryBlock = "";
        let memoryCount = 0;
        let hindsightBlock = "";
        let hindsightCount = 0;
        if (useMemory) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("content_memory")
            .select("title,platform,topic,content_type,likes,shares,comments,engagement_score,published_date")
            .order("engagement_score", { ascending: false });
          const rows = data ?? [];
          memoryCount = rows.length;
          memoryBlock = JSON.stringify(rows, null, 2);

          // Hindsight semantic recall based on last user message
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          const userText = lastUser?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join(" ")
            .trim();
          if (userText) {
            const { recallMemories, formatRecallForPrompt, hindsightConfigured } = await import("@/lib/hindsight.server");
            if (hindsightConfigured()) {
              const hits = await recallMemories(userText, 1500);
              hindsightCount = hits.length;
              hindsightBlock = `\n\n=== HINDSIGHT RECALL (${hits.length} semantically relevant memories for this question) ===\n${formatRecallForPrompt(hits)}\n=== END HINDSIGHT ===`;
            }
          }
        }

        const system = useMemory
          ? `You are the Content Strategy Agent, a marketing strategist powered by HINDSIGHT MEMORY.\n\nYou have access to ${memoryCount} historical content records and ${hindsightCount} semantically-recalled Hindsight memories. Every recommendation, analysis, or answer MUST cite specific numbers from this memory (engagement scores, comparisons across topics/platforms/formats). Never give generic marketing advice. If memory is empty, say so and ask the user to add content first.\n\n=== STRUCTURED MEMORY (${memoryCount} records, Postgres) ===\n${memoryBlock}\n=== END MEMORY ===${hindsightBlock}\n\nWhen recommending, structure as: insight from memory → recommendation → expected outcome.`
          : `You are a generic AI assistant with NO access to the team's content history or Hindsight memory. Answer marketing questions using only general knowledge. Do not invent specific numbers.`;

        const { createAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createAiGatewayProvider(key);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
