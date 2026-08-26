import { getDB } from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";
import { RateLimitResult } from "@/types";

export async function checkRateLimit(
  userId?: string,
  ipAddress: string = "127.0.0.1",
  d1Binding?: any
): Promise<RateLimitResult> {
  const db = getDB(d1Binding);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const limit = userId
    ? APP_CONFIG.limits.authenticatedDaily
    : APP_CONFIG.limits.guestDaily;

  let usageRecord;

  if (userId) {
    usageRecord = await db.queryOne<{ request_count: number }>(
      `SELECT request_count FROM usage WHERE user_id = ? AND date = ?`,
      [userId, today]
    );
  } else {
    usageRecord = await db.queryOne<{ request_count: number }>(
      `SELECT request_count FROM usage WHERE ip_address = ? AND date = ?`,
      [ipAddress, today]
    );
  }

  const currentCount = usageRecord?.request_count || 0;
  const remaining = Math.max(0, limit - currentCount);

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetSeconds: 86400 - (Math.floor(Date.now() / 1000) % 86400),
      message: userId
        ? `You've reached today's free AI limit (${limit} messages/day). Please try again tomorrow.`
        : `Guest daily limit reached (${limit} messages/day). Sign up for a free BodhAI account to get ${APP_CONFIG.limits.authenticatedDaily} messages/day!`,
    };
  }

  return {
    allowed: true,
    remaining: remaining - 1,
    limit,
    resetSeconds: 86400 - (Math.floor(Date.now() / 1000) % 86400),
  };
}

export async function recordUsage(
  userId?: string,
  ipAddress: string = "127.0.0.1",
  tokensUsed: number = 0,
  d1Binding?: any
) {
  const db = getDB(d1Binding);
  const today = new Date().toISOString().split("T")[0];
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO usage (id, user_id, ip_address, date, request_count, token_count)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [id, userId || null, ipAddress, today, tokensUsed]
  );
}
