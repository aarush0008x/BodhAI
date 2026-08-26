import { Message } from "@/types";
import { AIProvider, AIProviderOptions } from "./provider";
import { APP_CONFIG } from "@/lib/config";

export class CloudflareAIProvider implements AIProvider {
  name = "Cloudflare Workers AI";

  constructor(
    private cfBinding?: any,
    private accountId?: string,
    private apiToken?: string
  ) {}

  private formatMessages(messages: Message[], customSystemPrompt?: string) {
    const formatted = [];
    const systemPrompt = customSystemPrompt || APP_CONFIG.systemPrompt;
    
    formatted.push({ role: "system", content: systemPrompt });

    // Truncate context to max messages
    const recentMessages = messages.slice(-APP_CONFIG.limits.maxContextMessages);
    for (const msg of recentMessages) {
      formatted.push({ role: msg.role, content: msg.content });
    }

    return formatted;
  }

  async generateResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): Promise<{ content: string; tokensUsed?: number }> {
    const model = options?.model || APP_CONFIG.defaultModel;
    const formattedMessages = this.formatMessages(messages, options?.systemPrompt);

    // 1. Direct Workers AI binding execution (if in Cloudflare Worker runtime)
    if (this.cfBinding) {
      const response = await this.cfBinding.run(model, {
        messages: formattedMessages,
        temperature: options?.temperature ?? 0.7,
      });
      return {
        content: response.response || response.description || "",
        tokensUsed: Math.ceil((response.response?.length || 0) / 4),
      };
    }

    // 2. Cloudflare Workers AI REST API execution
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error(
        "Cloudflare Workers AI credentials missing (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required for REST access)."
      );
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: formattedMessages,
        temperature: options?.temperature ?? 0.7,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudflare AI API Error (${res.status}): ${errorText}`);
    }

    const data: any = await res.json();
    const content = data.result?.response || data.result?.description || "";

    return {
      content,
      tokensUsed: Math.ceil(content.length / 4),
    };
  }

  async *streamResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || APP_CONFIG.defaultModel;
    const formattedMessages = this.formatMessages(messages, options?.systemPrompt);

    // 1. Workers AI binding streaming
    if (this.cfBinding) {
      const stream = await this.cfBinding.run(model, {
        messages: formattedMessages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE data lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") return;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.response) {
                yield parsed.response;
              }
            } catch (e) {
              // ignore incomplete JSON buffers
            }
          }
        }
      }
      return;
    }

    // 2. Cloudflare REST API SSE streaming
    const accountId = this.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = this.apiToken || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error("Cloudflare Workers AI credentials missing for streaming.");
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: formattedMessages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
      }),
      signal: options?.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Cloudflare Workers AI Streaming Error (${res.status})`);
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
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.response) {
              yield parsed.response;
            }
          } catch (e) {
            // Buffer incomplete data
          }
        }
      }
    }
  }
}
