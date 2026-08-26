import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDB } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bodhai.com";

  if (!user || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Access denied. Admin authorization required." }, { status: 403 });
  }

  const db = getDB();
  const totalUsers = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM users`);
  const totalConversations = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM conversations`);
  const totalMessages = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM messages`);
  const dailyUsage = await db.query(`SELECT date, SUM(request_count) as total_requests, SUM(token_count) as total_tokens FROM usage GROUP BY date ORDER BY date DESC LIMIT 14`);

  return NextResponse.json({
    metrics: {
      totalUsers: totalUsers?.count || 0,
      totalConversations: totalConversations?.count || 0,
      totalMessages: totalMessages?.count || 0,
    },
    dailyUsage,
  });
}
