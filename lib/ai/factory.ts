import { AIProvider } from "./provider";
import { CloudflareAIProvider } from "./cloudflare-provider";
import { OllamaProvider } from "./ollama-provider";
import { MockAIProvider } from "./mock-provider";

export function getAIProvider(cfBinding?: any): AIProvider {
  // If running inside Cloudflare Workers runtime with AI binding
  if (cfBinding) {
    return new CloudflareAIProvider(cfBinding);
  }

  const isProduction = process.env.NODE_ENV === "production";
  const configuredProvider = (process.env.AI_PROVIDER || (isProduction ? "cloudflare" : "mock")).toLowerCase();

  if (configuredProvider === "ollama") {
    if (isProduction) {
      throw new Error("Ollama provider is forbidden in production environments.");
    }
    return new OllamaProvider();
  }

  if (configuredProvider === "mock") {
    if (isProduction) {
      throw new Error("MockAIProvider is forbidden in production environments.");
    }
    return new MockAIProvider();
  }

  // Cloudflare Workers AI REST API execution
  const hasCFCredentials =
    Boolean(process.env.CLOUDFLARE_ACCOUNT_ID) &&
    Boolean(process.env.CLOUDFLARE_API_TOKEN);

  if (hasCFCredentials) {
    return new CloudflareAIProvider();
  }

  // Strict check for production mode
  if (isProduction || configuredProvider === "cloudflare") {
    throw new Error(
      "Cloudflare Workers AI credentials missing (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required for REST API inference). Silent mock fallback is prohibited in production."
    );
  }

  // Development-only fallback
  return new MockAIProvider();
}
