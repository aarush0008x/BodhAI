import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate automatic short title from first prompt
export function generateConversationTitle(prompt: string): string {
  if (!prompt || !prompt.trim()) return "New Conversation";

  const clean = prompt
    .trim()
    .replace(/^(how to|what is|why does|can you|help me|explain|write a|create a)\s+/i, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\?+$/, "")
    .trim();

  if (!clean) return "New Conversation";

  // Capitalize first letter
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
  
  if (formatted.length <= 45) {
    return formatted;
  }

  // Truncate at word boundary
  const words = formatted.split(" ");
  let title = "";
  for (const word of words) {
    if ((title + " " + word).trim().length > 40) break;
    title += (title ? " " : "") + word;
  }

  return (title || formatted.substring(0, 40)) + "...";
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
