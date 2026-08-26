import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
} from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name } = (await req.json()) as any;
    const db = getDB();

    if (action === "signup") {
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: "Name, email, and password are required." },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      const existing = await db.queryOne(
        `SELECT id FROM users WHERE email = ?`,
        [email.toLowerCase()]
      );

      if (existing) {
        return NextResponse.json(
          { error: "An account with this email address already exists." },
          { status: 400 }
        );
      }

      const userId = crypto.randomUUID();
      const passwordHash = await hashPassword(password);

      await db.execute(
        `INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`,
        [userId, email.toLowerCase(), passwordHash, name]
      );

      // Create session
      const session = await createSession(userId);
      await setSessionCookie(session.token);

      const user = await db.queryOne(
        `SELECT id, email, name, avatar_url, theme, default_model, created_at, updated_at FROM users WHERE id = ?`,
        [userId]
      );

      return NextResponse.json({ success: true, user });
    }

    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required." },
          { status: 400 }
        );
      }

      const user = await db.queryOne<any>(
        `SELECT * FROM users WHERE email = ?`,
        [email.toLowerCase()]
      );

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const session = await createSession(user.id);
      await setSessionCookie(session.token);

      const { password_hash, ...safeUser } = user;
      return NextResponse.json({ success: true, user: safeUser });
    }

    if (action === "logout") {
      await clearSessionCookie();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (e: any) {
    console.error("Auth API Error:", e);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
