export type TCGContext = "pokemon" | "magic" | "yugioh" | "lorcana" | "onepiece" | null;

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  tcg_context: TCGContext;
  messages: ChatMessage[];
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  tcg_context: TCGContext;
  last_message: string | null;
  created_at: string;
  message_count: number;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  tcg_context?: TCGContext;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  role: "assistant";
}
