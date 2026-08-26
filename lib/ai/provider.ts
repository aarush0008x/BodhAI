import { Message } from "@/types";

export interface AIProviderOptions {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface AIProvider {
  name: string;
  generateResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): Promise<{ content: string; tokensUsed?: number }>;

  streamResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown>;
}
