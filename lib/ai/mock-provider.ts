import { Message } from "@/types";
import { AIProvider, AIProviderOptions } from "./provider";

export class MockAIProvider implements AIProvider {
  name = "BodhAI Offline Engine";

  private getKnowledgeResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();

    if (lower.includes("react") || lower.includes("next")) {
      return `### Understanding React & Next.js Architecture

React is a declarative, component-based UI library designed for building interactive user interfaces. Next.js extends React by bringing full-stack capabilities, server rendering (SSR/SSG), and edge routing.

#### Key Principles:
1. **Component Hierarchy**: Break UI into modular, reusable building blocks.
2. **State & Lifecycle**: React tracks data mutations and efficiently updates the Virtual DOM.
3. **Server Components**: Next.js App Router renders components on the server for speed and zero-JS client bundles.

\`\`\`typescript
// Example React Server Component in Next.js
export default async function UserProfile({ id }: { id: string }) {
  const user = await fetchUser(id);
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <h2 className="text-lg font-semibold">{user.name}</h2>
      <p className="text-muted-fg">{user.email}</p>
    </div>
  );
}
\`\`\`

Would you like to explore state management or routing next?`;
    }

    if (lower.includes("code") || lower.includes("python") || lower.includes("javascript") || lower.includes("typescript")) {
      return `Here is a clear TypeScript solution designed for clarity, safety, and modern best practices:

\`\`\`typescript
interface KnowledgeItem {
  id: string;
  topic: string;
  summary: string;
  createdAt: Date;
}

export function summarizeKnowledge(items: KnowledgeItem[]): string {
  if (!items.length) {
    return "No knowledge entries available.";
  }

  return items
    .map((item) => \`• [\${item.topic}]: \${item.summary}\`)
    .join("\\n");
}
\`\`\`

#### Key Highlights:
- **Strict Typing**: Ensures interface compliance at compile time.
- **Pure Function**: Predictable output with zero side effects.
- **Clean Formatting**: Formats lists into readable markdown bullets.`;
    }

    return `Hello! I am **BodhAI** — your intelligent AI assistant built to help you think, learn, create, and solve problems.

### How I can assist you:
- 💡 **Deconstruct Complex Concepts**: Breaking down hard ideas into clear, digestible explanations.
- ⚡ **Coding & System Design**: Writing production-grade code, debugging, and architecting full-stack systems.
- 📚 **Accelerated Learning**: Guiding you step-by-step through technical and creative topics.

What would you like to explore or solve together today?`;
  }

  async generateResponse(
    messages: Message[],
    _options?: AIProviderOptions
  ): Promise<{ content: string; tokensUsed?: number }> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const content = this.getKnowledgeResponse(lastUserMsg);
    return {
      content,
      tokensUsed: Math.ceil(content.length / 4),
    };
  }

  async *streamResponse(
    messages: Message[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const fullText = this.getKnowledgeResponse(lastUserMsg);

    // Split into small token words for streaming simulation
    const words = fullText.split(" ");
    for (let i = 0; i < words.length; i++) {
      if (options?.signal?.aborted) {
        break;
      }
      const token = (i === 0 ? "" : " ") + words[i];
      yield token;
      // Slight delay for realistic typing pace in mock mode
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
