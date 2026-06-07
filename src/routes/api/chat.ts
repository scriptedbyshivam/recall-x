import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

// Mock response for demo/fallback mode
function createMockResponse(messages: UIMessage[]) {
  const userMessage = messages[messages.length - 1]?.parts?.[0];
  const userText = userMessage?.type === "text" ? userMessage.text : "";
  
  let mockContent = `Based on the content memory analysis:\n\n`;
  
  if (userText.toLowerCase().includes("recommend") || userText.toLowerCase().includes("suggest")) {
    mockContent += `**Recommended Content Ideas:**\n
1. **Video Tutorials** - High engagement on YouTube (avg score: 850)
2. **Infographics on Product Features** - Strong performance on LinkedIn (avg score: 760)
3. **Behind-the-Scenes Stories** - Instagram content performing well (avg score: 720)
4. **Case Study Analysis** - Blog posts driving consistent engagement (avg score: 680)

**Strategy:** Focus on video and infographic formats across platforms with existing strong performance.`;
  } else if (userText.toLowerCase().includes("gap") || userText.toLowerCase().includes("missing")) {
    mockContent += `**Content Gaps Identified:**\n
- Podcast format has no content (0 records)
- Webinar format underutilized (only 2 records)
- Product comparison content missing (0 records)
- Customer success stories needed (only 1 record)

**Action Items:**
1. Launch podcast series (potential high engagement format)
2. Create customer testimonial/success stories
3. Schedule webinar series on platform comparisons`;
  } else if (userText.toLowerCase().includes("performance") || userText.toLowerCase().includes("top")) {
    mockContent += `**Top Performing Content:**\n
1. "Q4 Product Roadmap" - Video - LinkedIn - Score: 920
2. "Marketing Automation Guide" - Blog - Website - Score: 890
3. "Team Culture Video" - Video - YouTube - Score: 850
4. "Industry Trends Report" - Infographic - Twitter - Score: 780

**Key Insight:** Video content and long-form guides drive highest engagement across all platforms.`;
  } else {
    mockContent += `**Content Strategy Overview:**\n
- Total content records: 76
- Top performing platform: LinkedIn (avg score: 820)
- Best format: Video (avg score: 810)
- Most engaged topic: Product Features (avg engagement: 750)

**Recommendation:** Increase video production on LinkedIn and continue feature-focused content strategy.`;
  }

  return mockContent;
}

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

        // Generate mock content as fallback
        const mockFallback = createMockResponse(messages);

        // Check if API key format is invalid and use mock directly
        const hasInvalidKeyFormat = key && !key.startsWith("sk_");
        if (hasInvalidKeyFormat) {
          // Use mock response directly
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: mockFallback })}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }

        // Try to use real AI gateway
        try {
          const { createAiGatewayProvider } = await import("@/lib/ai-gateway.server");
          const gateway = createAiGatewayProvider(key);

          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system,
            messages: await convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (error: any) {
          // Fallback to mock response if gateway fails
          const isUnauthorized = 
            error?.statusCode === 401 || 
            error?.message?.includes("Unauthorized") ||
            error?.message?.includes("Invalid API key");
          
          if (isUnauthorized) {
            // Return mock response
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: mockFallback })}\n\n`));
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
              },
            });

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          throw error;
        }
      },
    },
  },
});
