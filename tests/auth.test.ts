import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth/session";
import { generateConversationTitle } from "../lib/utils";

describe("BodhAI Auth & Security Utilities", () => {
  it("should hash and verify passwords correctly", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain(":");

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("WrongPassword", hash);
    expect(isInvalid).toBe(false);
  });

  it("should generate cryptographically unique random tokens", () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it("should generate clean, deterministic conversation titles", () => {
    const prompt1 = "How to build a Next.js app with Tailwind CSS?";
    const title1 = generateConversationTitle(prompt1);
    expect(title1).toBe("Build a Next.js app with Tailwind CSS");

    const prompt2 = "Explain Quantum Computing in simple terms";
    const title2 = generateConversationTitle(prompt2);
    expect(title2).toBe("Quantum Computing in simple terms");
  });
});
