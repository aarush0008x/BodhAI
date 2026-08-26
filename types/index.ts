export type MessageRole = "system" | "user" | "assistant";
export type MessageStatus = "streaming" | "completed" | "failed" | "interrupted";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: "admin" | "user";
  theme: "light" | "dark" | "system";
  default_model: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id?: string;
  title: string;
  model: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  tokens_used?: number;
  created_at: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id: string;
  enter_to_send: boolean;
  show_timestamps: boolean;
  compact_mode: boolean;
  temperature: number;
  system_prompt: string;
}

export interface UsageRecord {
  id: string;
  user_id?: string;
  ip_address: string;
  date: string;
  request_count: number;
  token_count: number;
  updated_at: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  message?: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: "cloudflare" | "ollama" | "mock";
  description: string;
  isDefault?: boolean;
}

export interface StreamChunk {
  text: string;
  done: boolean;
  error?: string;
}

export interface ShareResponse {
  share_url: string;
  share_token: string;
  expires_at?: string | null;
  is_active: boolean;
}

export interface SharedMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface SharedConversation {
  title: string;
  model: string;
  created_at: string;
  messages: SharedMessage[];
}

export type StreamEventType =
  | "message_start"
  | "message_delta"
  | "message_complete"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  conversation_id?: string;
  conversation_title?: string;
  message_id?: string;
  user_message_id?: string;
  model?: string;
  content?: string;
  finish_reason?: string;
  tokens_used?: number;
  code?: string;
  message?: string;
  is_new?: boolean;
}
