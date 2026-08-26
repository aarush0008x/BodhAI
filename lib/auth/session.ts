import { getDB } from "@/lib/db";
import { User, Session } from "@/types";
import { cookies } from "next/headers";

const SESSION_COOKIE = "bodhai_session";
const SESSION_DURATION_DAYS = 14;

const KNOWN_DEV_SECRETS = [
  "bodhai_development_auth_secret_key_32_characters_long",
  "bodhai_secure_auth_secret_token_change_in_production_32_chars",
  "change-this-in-production-min-32-chars-long",
  "secret",
  "12345678901234567890123456789012",
];

export function validateAuthSecret(): void {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SECURITY ERROR: AUTH_SECRET must be at least 32 characters long in production.");
    }
  }
  if (process.env.NODE_ENV === "production" && KNOWN_DEV_SECRETS.includes(authSecret || "")) {
    throw new Error("SECURITY ERROR: Default development secret detected in production environment. Set a unique AUTH_SECRET using Cloudflare secrets.");
  }
}

// Web Crypto PBKDF2 Password Hashing
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const hashHex = Array.from(new Uint8Array(exportedKey))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, originalHashHex] = storedHash.split(":");
    if (!saltHex || !originalHashHex) return false;

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedKey = await crypto.subtle.exportKey("raw", key);
    const hashHex = Array.from(new Uint8Array(exportedKey))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex === originalHashHex;
  } catch (e) {
    return false;
  }
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(userId: string, d1Binding?: any): Promise<Session> {
  const db = getDB(d1Binding);
  const token = generateToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.execute(
    `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    [id, userId, token, expiresAt]
  );

  return { id, user_id: userId, token, expires_at: expiresAt, created_at: new Date().toISOString() };
}

export async function getCurrentUser(d1Binding?: any): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const db = getDB(d1Binding);
    const session = await db.queryOne<Session>(
      `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
      [token]
    );

    if (!session) return null;

    const user = await db.queryOne<User>(
      `SELECT id, email, name, avatar_url, theme, default_model, created_at, updated_at FROM users WHERE id = ?`,
      [session.user_id]
    );

    return user;
  } catch (e) {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie(d1Binding?: any) {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDB(d1Binding);
    await db.execute(`DELETE FROM sessions WHERE token = ?`, [token]);
  }
  cookieStore.delete(SESSION_COOKIE);
}
