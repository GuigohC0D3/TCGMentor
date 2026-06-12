import axios from "axios";
import { useAuthStore } from "@/stores/auth";

// All requests go through the Next.js rewrite (/api/backend -> backend /api/v1)
// so the httpOnly auth cookie is first-party and sent automatically.
export const api = axios.create({
  baseURL: "/api/backend",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// --- SSE helper ---
// Same-origin requests: the auth cookie is sent automatically
async function streamSSE(
  url: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  onDone: (conversationId: string | null) => void,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) {
      const detail = await res.json().then((d) => d?.detail).catch(() => null);
      throw new Error(detail ?? "Limite de mensagens atingido. Tente mais tarde.");
    }
    throw new Error(`Stream failed: ${res.status}`);
  }
  const conversationId = res.headers.get("X-Conversation-Id");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      const sentinel = payload.trim();
      if (!sentinel) continue;
      if (sentinel === "[DONE]") {
        onDone(conversationId); // always save conversation ID
        if (streamError) throw new Error(streamError);
        return;
      }
      if (sentinel.startsWith("[ERROR]")) {
        streamError = sentinel.slice(8); // buffer, don't throw yet
        continue;
      }
      // Content chunks are JSON-encoded strings so whitespace and
      // newlines survive SSE framing
      try {
        onChunk(JSON.parse(sentinel));
      } catch {
        onChunk(payload);
      }
    }
  }
}

// --- Chat ---
export const chatApi = {
  sendMessage: (data: { conversation_id?: string; message: string; tcg_context?: string | null }) =>
    api.post("/chat", data),

  getConversations: (q?: string) =>
    api.get("/chat/conversations", { params: q ? { q } : undefined }),

  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),

  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),

  streamMessage: (
    data: { conversation_id?: string; message: string; tcg_context?: string | null },
    onChunk: (chunk: string) => void,
    onDone: (conversationId: string | null) => void,
  ) => streamSSE("/api/chat/stream", data, onChunk, onDone),

  regenerate: (
    conversationId: string,
    onChunk: (chunk: string) => void,
    onDone: (conversationId: string | null) => void,
  ) =>
    streamSSE("/api/chat/regenerate", { conversation_id: conversationId }, onChunk, onDone),
};

// --- Users ---
export const usersApi = {
  updateMe: (data: { full_name?: string; skill_level?: string; preferred_tcg?: string }) =>
    api.patch("/users/me", data),
};

// --- Decks ---
export const decksApi = {
  list: () => api.get("/decks"),
  get: (id: string) => api.get(`/decks/${id}`),
  create: (data: { name: string; tcg: string; cards: { name: string; quantity: number }[] }) =>
    api.post("/decks", data),
  update: (id: string, data: { name?: string; cards?: { name: string; quantity: number }[] }) =>
    api.put(`/decks/${id}`, data),
  remove: (id: string) => api.delete(`/decks/${id}`),
  analyze: (id: string) => api.post(`/decks/${id}/analyze`),
};

// --- Cards ---
export interface CardFilters {
  type?: string;
  color?: string;
  rarity?: string;
}

export const cardsApi = {
  search: (tcg: string, q: string, filters: CardFilters = {}, limit = 20, signal?: AbortSignal) =>
    api.get("/cards/search", {
      signal,
      params: {
        tcg,
        ...(q ? { q } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.color ? { color: filters.color } : {}),
        ...(filters.rarity ? { rarity: filters.rarity } : {}),
        limit,
      },
    }),
};
