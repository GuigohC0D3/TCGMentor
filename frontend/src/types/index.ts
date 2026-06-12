export type TCGContext = "pokemon" | "magic" | "yugioh" | "lorcana" | "onepiece" | null;

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_premium: boolean;
  skill_level: SkillLevel | null;
  preferred_tcg: Exclude<TCGContext, null> | null;
  created_at: string;
}

export interface AuthState {
  user: User | null;
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

// --- Decks ---

export type DeckTier = "S" | "A" | "B" | "C";

export interface DeckCard {
  name: string;
  quantity: number;
}

export interface ComboEntry {
  cards: string[];
  description: string;
}

export interface MatchupEntry {
  deck: string;
  reason: string;
}

export interface DeckAnalysis {
  tier: DeckTier;
  archetype: string;
  summary: string;
  tips: string[];
  combos: ComboEntry[];
  strong_against: MatchupEntry[];
  weak_against: MatchupEntry[];
  improvements: string[];
}

export interface Deck {
  id: string;
  name: string;
  tcg: Exclude<TCGContext, null>;
  cards: DeckCard[];
  analysis: DeckAnalysis | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeckSummary {
  id: string;
  name: string;
  tcg: Exclude<TCGContext, null>;
  card_count: number;
  tier: DeckTier | null;
  created_at: string;
}

export interface CardResult {
  name: string;
  type_line: string | null;
  text: string | null;
  cost: string | null;
  rarity: string | null;
  set_name: string | null;
  image_url: string | null;
}
