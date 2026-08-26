import { Message } from "@/types";
import { AIProvider, AIProviderOptions } from "./provider";
import { APP_CONFIG } from "@/lib/config";

export class OllamaProvider implements AIProvider {
  name = "Ollama Local";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  async generateResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): Promise<{ content: string; tokensUsed?: number }> {
    const model = options?.model || "llama3.1:latest";
    const formatted = messages.map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options?.systemPrompt || APP_CONFIG.systemPrompt },
          ...formatted,
        ],
        stream: false,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    return {
      content: data.message?.content || "",
      tokensUsed: data.eval_count || 0,
    };
  }

  async *streamResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || "llama3.1:latest";
    const formatted = messages.map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options?.systemPrompt || APP_CONFIG.systemPrompt },
          ...formatted,
        ],
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error("Ollama connection failed.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
        } catch (e) {
          // ignore incomplete lines
        }
      }
    }
  }
}
