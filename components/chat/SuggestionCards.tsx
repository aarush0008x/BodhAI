"use client";

import React from "react";
import { Logo } from "@/components/brand/Logo";
import { BookOpen, Code2, Lightbulb, GraduationCap } from "lucide-react";

interface SuggestionCardsProps {
  onSelectSuggestion: (prompt: string) => void;
}

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({
  onSelectSuggestion,
}) => {
  const suggestions = [
    {
      icon: BookOpen,
      title: "Explain a concept",
      prompt: "Explain Quantum Computing in simple terms with practical analogies.",
      description: "Deconstruct complex topics into clear explanations.",
    },
    {
      icon: Code2,
      title: "Help me code",
      prompt: "How do I implement custom middleware and rate limiting in Next.js App Router?",
      description: "Write clean, robust code with architectural guidance.",
    },
    {
      icon: Lightbulb,
      title: "Analyze an idea",
      prompt: "What are the core technical trade-offs between Cloudflare D1 and traditional PostgreSQL?",
      description: "Evaluate technical decisions and system design.",
    },
    {
      icon: GraduationCap,
      title: "Help me learn",
      prompt: "Create a 5-step learning roadmap to master full-stack TypeScript and React.",
      description: "Guided step-by-step learning path for any skill.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto select-none animate-fadeIn">
      <div className="mb-4">
        <Logo size="lg" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        What would you like to understand?
      </h1>
      <p className="text-sm text-muted-fg mb-8 max-w-md">
        BodhAI makes complex concepts, code, and ideas intuitive and accessible.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group text-left p-4 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-accent/40 transition-all duration-200 shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-foreground">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-muted-fg line-clamp-2 leading-normal">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
