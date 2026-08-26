import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword, clearSessionCookie } from "@/lib/auth/session";
import { getDB } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDB();
  const settings = await db.queryOne(`SELECT * FROM user_settings WHERE user_id = ?`, [user.id]);
  const usage = await db.query(
    `SELECT date, request_count, token_count FROM usage WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
    [user.id]
  );

  return NextResponse.json({ user, settings, usage });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as any;
  const db = getDB();

  if (body.type === "profile") {
    const { name, theme, default_model } = body;
    await db.execute(
      `UPDATE users SET name = COALESCE(?, name), theme = COALESCE(?, theme), default_model = COALESCE(?, default_model) WHERE id = ?`,
      [name, theme, default_model, user.id]
    );
  } else if (body.type === "password") {
    const { currentPassword, newPassword } = body;
    const fullUser = await db.queryOne<any>(`SELECT password_hash FROM users WHERE id = ?`, [user.id]);
    const valid = await verifyPassword(currentPassword, fullUser?.password_hash || "");
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    const newHash = await hashPassword(newPassword);
    await db.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, user.id]);
  }

  const updatedUser = await db.queryOne(
    `SELECT id, email, name, avatar_url, theme, default_model, created_at, updated_at FROM users WHERE id = ?`,
    [user.id]
  );

  return NextResponse.json({ success: true, user: updatedUser });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { confirmation } = (await req.json()) as any;
  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text must equal 'DELETE'." }, { status: 400 });
  }

  const db = getDB();
  await db.execute(`DELETE FROM users WHERE id = ?`, [user.id]);
  await clearSessionCookie();

  return NextResponse.json({ success: true, message: "Account deleted." });
}
