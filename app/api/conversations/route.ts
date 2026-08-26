import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const db = getDB();

  // If export requested
  const exportFormat = req.nextUrl.searchParams.get("export");
  if (exportFormat && user) {
    const convs = await db.query(
      `SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC`,
      [user.id]
    );

    const fullExport = [];
    for (const c of convs) {
      const msgs = await db.query(
        `SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [c.id]
      );
      fullExport.push({ ...c, messages: msgs });
    }

    return new NextResponse(JSON.stringify(fullExport, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="bodhai-export-${user.id}.json"`,
      },
    });
  }

  // Regular list
  const userId = user?.id || "guest";
  const conversations = await db.query(
    `SELECT id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const { title, model } = (await req.json()) as any;
  const db = getDB();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)`,
    [id, user?.id || "guest", title || "New Conversation", model || "@cf/meta/llama-3.1-8b-instruct-fast"]
  );

  const conv = await db.queryOne(`SELECT * FROM conversations WHERE id = ?`, [id]);
  return NextResponse.json({ conversation: conv });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDB();
  await db.execute(`DELETE FROM conversations WHERE user_id = ?`, [user.id]);
  return NextResponse.json({ success: true });
}
