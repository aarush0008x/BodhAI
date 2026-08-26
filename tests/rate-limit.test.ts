import { describe, it, expect } from "vitest";
import { checkRateLimit, recordUsage } from "../lib/rate-limit/limiter";

describe("BodhAI Rate Limiting", () => {
  it("should allow initial request within daily limits", async () => {
    const testUserId = "test-user-" + Date.now();
    const result = await checkRateLimit(testUserId, "127.0.0.1");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(30);
  });

  it("should correctly increment and track usage in database", async () => {
    const testUserId = "test-user-usage-" + Date.now();
    await recordUsage(testUserId, "127.0.0.1", 150);

    const result = await checkRateLimit(testUserId, "127.0.0.1");
    expect(result.remaining).toBe(29);
  });
});
