import { AIModelOption } from "@/types";
import { DEFAULT_SYSTEM_PROMPT } from "./system-prompt";

export const APP_CONFIG = {
  name: "BodhAI",
  tagline: "Intelligence, made understandable.",
  shortTagline: "Think. Ask. Understand.",
  version: "1.0.0",
  defaultModel: process.env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  limits: {
    authenticatedDaily: parseInt(process.env.AUTHENTICATED_DAILY_LIMIT || "30", 10),
    guestDaily: parseInt(process.env.GUEST_DAILY_LIMIT || "5", 10),
    maxPromptChars: parseInt(process.env.MAX_PROMPT_CHARS || "10000", 10),
    maxContextMessages: 12, // Maintain last 12 messages for conversation context
  },
};

export const AVAILABLE_MODELS: AIModelOption[] = [
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    name: "BodhAI • Llama 3.1 8B Fast",
    provider: "cloudflare",
    description: "Highly intelligent, fast open-source model suited for reasoning, coding, and learning.",
    isDefault: true,
  },
  {
    id: "@cf/meta/llama-3-8b-instruct",
    name: "BodhAI • Llama 3 8B",
    provider: "cloudflare",
    description: "Fast instruction-tuned model for quick answers and creative problem solving.",
  },
  {
    id: "@cf/mistral/mistral-7b-instruct-v0.1",
    name: "BodhAI • Mistral 7B",
    provider: "cloudflare",
    description: "Lightweight and ultra-fast model for explanations and quick coding assistance.",
  },
];
