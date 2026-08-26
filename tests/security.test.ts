import { describe, it, expect } from "vitest";
import { getDB } from "../lib/db";
import { validateAuthSecret } from "../lib/auth/session";

describe("BodhAI Security & User Data Isolation (IDOR Checks)", () => {
  it("should prevent User A from reading or deleting User B's conversation (IDOR)", async () => {
    const db = getDB();

    const userA_Id = "user-a-" + Date.now();
    const userB_Id = "user-b-" + Date.now();
    const convB_Id = "conv-b-" + Date.now();

    // Setup User B's conversation
    await db.execute(
      `INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)`,
      [convB_Id, userB_Id, "Private Conv B", "@cf/meta/llama-3.1-8b-instruct-fast"]
    );

    // User A attempts to query User B's conversation using ID + user_id scope
    const queryResultUserA = await db.queryOne(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [convB_Id, userA_Id]
    );

    // User A query MUST return null
    expect(queryResultUserA).toBeNull();

    // User A attempts to delete User B's conversation
    const deleteResultUserA = await db.execute(
      `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
      [convB_Id, userA_Id]
    );

    // Changes count MUST be 0
    expect(deleteResultUserA.changes).toBe(0);

    // User B queries their own conversation
    const queryResultUserB = await db.queryOne(
      `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
      [convB_Id, userB_Id]
    );

    expect(queryResultUserB).not.toBeNull();
    expect(queryResultUserB?.title).toBe("Private Conv B");
  });

  it("should throw an error when default dev secrets are used in production", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.AUTH_SECRET;

    try {
      (process.env as any).NODE_ENV = "production";
      process.env.AUTH_SECRET = "bodhai_development_auth_secret_key_32_characters_long";

      expect(() => validateAuthSecret()).toThrowError(/SECURITY ERROR/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      process.env.AUTH_SECRET = originalSecret;
    }
  });
});
