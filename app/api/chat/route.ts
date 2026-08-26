import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDB } from "@/lib/db";
import { checkRateLimit, recordUsage } from "@/lib/rate-limit/limiter";
import { getAIProvider } from "@/lib/ai/factory";
import { APP_CONFIG } from "@/lib/config";
import { generateConversationTitle } from "@/lib/utils";
import { Message } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // 1. Rate limiting check
    const rateLimit = await checkRateLimit(user?.id, ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message || "Rate limit reached." },
        { status: 429 }
      );
    }

    const { prompt, conversationId, model, temperature } = (await req.json()) as any;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 400 });
    }

    if (prompt.length > APP_CONFIG.limits.maxPromptChars) {
      return NextResponse.json(
        {
          error: `Message exceeds maximum limit of ${APP_CONFIG.limits.maxPromptChars.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    const db = getDB();
    let currentConvId = conversationId;
    let isNewConv = false;

    // 2. Fetch or create conversation
    if (currentConvId) {
      const conv = await db.queryOne(
        `SELECT * FROM conversations WHERE id = ? ${user ? "AND user_id = ?" : ""}`,
        user ? [currentConvId, user.id] : [currentConvId]
      );
      if (!conv) {
        return NextResponse.json(
          { error: "Conversation not found or access denied." },
          { status: 404 }
        );
      }
    } else {
      isNewConv = true;
      currentConvId = crypto.randomUUID();
      const title = generateConversationTitle(prompt);
      const selectedModel = model || user?.default_model || APP_CONFIG.defaultModel;

      await db.execute(
        `INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)`,
        [currentConvId, user?.id || "guest", title, selectedModel]
      );
    }

    // 3. Save User Message
    const userMsgId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`,
      [userMsgId, currentConvId, prompt.trim()]
    );

    // 4. Fetch prior message context
    const historyMessages = await db.query<Message>(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [currentConvId]
    );

    // 5. Stream AI Response
    const aiProvider = getAIProvider();
    const assistantMsgId = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = "";

        // Send conversation metadata header chunk
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "meta", conversationId: currentConvId, isNewConv })}\n\n`
          )
        );

        try {
          const generator = aiProvider.streamResponse(historyMessages, {
            model: model || user?.default_model || APP_CONFIG.defaultModel,
            temperature: temperature ?? 0.7,
          });

          for await (const chunk of generator) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`)
            );
          }

          // Save completed assistant message to database
          const approxTokens = Math.ceil(fullResponse.length / 4);
          await db.execute(
            `INSERT INTO messages (id, conversation_id, role, content, tokens_used) VALUES (?, ?, 'assistant', ?, ?)`,
            [assistantMsgId, currentConvId, fullResponse, approxTokens]
          );

          // Record usage
          await recordUsage(user?.id, ip, approxTokens);

          // Close SSE stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          console.error("Streaming error:", err);
          const errorMsg = "BodhAI is temporarily unavailable. Please try again.";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    console.error("Chat Route Error:", e);
    return NextResponse.json(
      { error: "Failed to process message request." },
      { status: 500 }
    );
  }
}
