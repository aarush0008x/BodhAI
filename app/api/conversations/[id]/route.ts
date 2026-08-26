import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDB } from "@/lib/db";
import { Message } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const db = getDB();
  const userId = user?.id || "guest";

  const conversation = await db.queryOne(
    `SELECT * FROM conversations WHERE id = ? AND user_id = ?`,
    [params.id, userId]
  );

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await db.query<Message>(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [params.id]
  );

  return NextResponse.json({ conversation, messages });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const db = getDB();
  const userId = user?.id || "guest";

  const result = await db.execute(
    `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
    [params.id, userId]
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Conversation not found or unauthorized." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
