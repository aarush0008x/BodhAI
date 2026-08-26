import fs from "fs";
import path from "path";

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; success: boolean }>;
}

interface LocalStore {
  users: any[];
  sessions: any[];
  conversations: any[];
  messages: any[];
  user_settings: any[];
  usage: any[];
}

class LocalJSDBAdapter implements DatabaseAdapter {
  private filePath: string;
  private data: LocalStore = {
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    user_settings: [],
    usage: [],
  };

  constructor() {
    this.filePath = path.join(process.cwd(), "bodhai_dev_db.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load local DB, resetting store:", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save local DB:", e);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.load();
    const cleanSql = sql.trim().toLowerCase();

    if (cleanSql.includes("from users")) {
      let res = [...this.data.users];
      if (cleanSql.includes("where id = ?") && params[0]) {
        res = res.filter((u) => u.id === params[0]);
      } else if (cleanSql.includes("where email = ?") && params[0]) {
        res = res.filter((u) => u.email === params[0].toLowerCase());
      }
      return res as T[];
    }

    if (cleanSql.includes("from sessions")) {
      let res = [...this.data.sessions];
      if (cleanSql.includes("where token = ?") && params[0]) {
        res = res.filter((s) => s.token === params[0]);
      }
      return res as T[];
    }

    if (cleanSql.includes("from conversations")) {
      let res = [...this.data.conversations];

      if (cleanSql.includes("where id = ? and user_id = ?")) {
        const [id, userId] = params;
        res = res.filter((c) => c.id === id && c.user_id === userId);
      } else if (cleanSql.includes("where user_id = ?")) {
        const [userId] = params;
        res = res.filter((c) => c.user_id === userId);
      } else if (cleanSql.includes("where id = ?")) {
        const [id] = params;
        res = res.filter((c) => c.id === id);
      }

      // Sort by updated_at DESC
      res.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return res as T[];
    }

    if (cleanSql.includes("from messages")) {
      let res = [...this.data.messages];
      if (cleanSql.includes("where conversation_id = ?") && params[0]) {
        res = res.filter((m) => m.conversation_id === params[0]);
      }
      res.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return res as T[];
    }

    if (cleanSql.includes("from user_settings")) {
      let res = [...this.data.user_settings];
      if (cleanSql.includes("where user_id = ?") && params[0]) {
        res = res.filter((s) => s.user_id === params[0]);
      }
      return res as T[];
    }

    if (cleanSql.includes("from usage")) {
      let res = [...this.data.usage];
      if (cleanSql.includes("user_id = ?") && params[0]) {
        res = res.filter((u) => u.user_id === params[0] && (!params[1] || u.date === params[1]));
      } else if (cleanSql.includes("ip_address = ?") && params[0]) {
        res = res.filter((u) => u.ip_address === params[0] && (!params[1] || u.date === params[1]));
      }
      return res as T[];
    }

    return [] as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const list = await this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; success: boolean }> {
    this.load();
    const cleanSql = sql.trim().toLowerCase();

    // INSERT INTO users
    if (cleanSql.includes("insert into users")) {
      const [id, email, password_hash, name, avatar_url, theme, default_model] = params;
      const now = new Date().toISOString();
      this.data.users.push({
        id,
        email: (email || "").toLowerCase(),
        password_hash,
        name,
        avatar_url: avatar_url || null,
        theme: theme || "system",
        default_model: default_model || "@cf/meta/llama-3.1-8b-instruct-fast",
        created_at: now,
        updated_at: now,
      });
      this.save();
      return { changes: 1, success: true };
    }

    // INSERT INTO sessions
    if (cleanSql.includes("insert into sessions")) {
      const [id, user_id, token, expires_at] = params;
      this.data.sessions.push({
        id,
        user_id,
        token,
        expires_at,
        created_at: new Date().toISOString(),
      });
      this.save();
      return { changes: 1, success: true };
    }

    // INSERT INTO conversations
    if (cleanSql.includes("insert into conversations")) {
      const [id, user_id, title, model] = params;
      const now = new Date().toISOString();
      this.data.conversations.push({
        id,
        user_id,
        title,
        model: model || "@cf/meta/llama-3.1-8b-instruct-fast",
        created_at: now,
        updated_at: now,
      });
      this.save();
      return { changes: 1, success: true };
    }

    // INSERT INTO messages
    if (cleanSql.includes("insert into messages")) {
      const [id, conversation_id, role, content, tokens_used] = params;
      const now = new Date().toISOString();
      this.data.messages.push({
        id,
        conversation_id,
        role,
        content,
        tokens_used: tokens_used || 0,
        created_at: now,
      });
      // Touch conversation updated_at
      const conv = this.data.conversations.find((c) => c.id === conversation_id);
      if (conv) conv.updated_at = now;
      this.save();
      return { changes: 1, success: true };
    }

    // UPDATE conversations title
    if (cleanSql.includes("update conversations set title = ?")) {
      const [title, id] = params;
      const conv = this.data.conversations.find((c) => c.id === id);
      if (conv) {
        conv.title = title;
        conv.updated_at = new Date().toISOString();
        this.save();
        return { changes: 1, success: true };
      }
    }

    // UPDATE users (profile/theme/model)
    if (cleanSql.includes("update users")) {
      const user = this.data.users.find((u) => u.id === params[params.length - 1]);
      if (user) {
        if (cleanSql.includes("name = ?")) user.name = params[0];
        if (cleanSql.includes("theme = ?")) user.theme = params[0];
        if (cleanSql.includes("default_model = ?")) user.default_model = params[0];
        if (cleanSql.includes("password_hash = ?")) user.password_hash = params[0];
        user.updated_at = new Date().toISOString();
        this.save();
        return { changes: 1, success: true };
      }
    }

    // DELETE FROM sessions
    if (cleanSql.includes("delete from sessions")) {
      const token = params[0];
      const initial = this.data.sessions.length;
      this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
      this.save();
      return { changes: initial - this.data.sessions.length, success: true };
    }

    // DELETE FROM conversations
    if (cleanSql.includes("delete from conversations")) {
      const initial = this.data.conversations.length;
      if (cleanSql.includes("where id = ? and user_id = ?")) {
        const [id, userId] = params;
        this.data.conversations = this.data.conversations.filter(
          (c) => !(c.id === id && c.user_id === userId)
        );
      } else if (cleanSql.includes("where user_id = ?")) {
        const [userId] = params;
        this.data.conversations = this.data.conversations.filter((c) => c.user_id !== userId);
      }
      this.save();
      return { changes: initial - this.data.conversations.length, success: true };
    }

    // DELETE FROM users (Account deletion)
    if (cleanSql.includes("delete from users")) {
      const userId = params[0];
      this.data.users = this.data.users.filter((u) => u.id !== userId);
      this.data.sessions = this.data.sessions.filter((s) => s.user_id !== userId);
      const userConvs = this.data.conversations.filter((c) => c.user_id === userId).map((c) => c.id);
      this.data.conversations = this.data.conversations.filter((c) => c.user_id !== userId);
      this.data.messages = this.data.messages.filter((m) => !userConvs.includes(m.conversation_id));
      this.data.user_settings = this.data.user_settings.filter((s) => s.user_id !== userId);
      this.data.usage = this.data.usage.filter((u) => u.user_id !== userId);
      this.save();
      return { changes: 1, success: true };
    }

    // INSERT OR UPDATE usage
    if (cleanSql.includes("usage")) {
      const [id, userId, ip, date] = params;
      let record = this.data.usage.find(
        (u) => (userId && u.user_id === userId && u.date === date) || (u.ip_address === ip && u.date === date)
      );
      if (record) {
        record.request_count += 1;
        record.updated_at = new Date().toISOString();
      } else {
        record = {
          id: id || crypto.randomUUID(),
          user_id: userId || null,
          ip_address: ip,
          date,
          request_count: 1,
          token_count: 0,
          updated_at: new Date().toISOString(),
        };
        this.data.usage.push(record);
      }
      this.save();
      return { changes: 1, success: true };
    }

    return { changes: 0, success: true };
  }
}

class D1DatabaseAdapter implements DatabaseAdapter {
  constructor(private d1: any) {}

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const { results } = await stmt.all();
    return (results as T[]) || [];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.first();
    return (result as T) || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; success: boolean }> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const info = await stmt.run();
    return { changes: info.meta?.changes || 0, success: info.success };
  }
}

let localAdapterInstance: LocalJSDBAdapter | null = null;

export function getDB(d1Binding?: any): DatabaseAdapter {
  if (d1Binding) {
    return new D1DatabaseAdapter(d1Binding);
  }
  if (!localAdapterInstance) {
    localAdapterInstance = new LocalJSDBAdapter();
  }
  return localAdapterInstance;
}
