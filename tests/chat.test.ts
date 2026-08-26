import { describe, it, expect } from "vitest";
import { MockAIProvider } from "../lib/ai/mock-provider";
import { Message } from "../types";

describe("BodhAI AI Provider Engine", () => {
  it("should generate a response using MockAIProvider", async () => {
    const provider = new MockAIProvider();
    const messages: Message[] = [
      {
        id: "1",
        conversation_id: "c1",
        role: "user",
        content: "What is React?",
        created_at: new Date().toISOString(),
      },
    ];

    const response = await provider.generateResponse(messages);
    expect(response.content).toContain("React");
    expect(response.tokensUsed).toBeGreaterThan(0);
  });

  it("should stream tokens asynchronously using streamResponse", async () => {
    const provider = new MockAIProvider();
    const messages: Message[] = [
      {
        id: "1",
        conversation_id: "c1",
        role: "user",
        content: "Hello BodhAI",
        created_at: new Date().toISOString(),
      },
    ];

    let fullText = "";
    for await (const chunk of provider.streamResponse(messages)) {
      fullText += chunk;
    }

    expect(fullText).toContain("BodhAI");
  });
});
