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

// --- Chat ---
export const chatApi = {
  sendMessage: (data: { conversation_id?: string; message: string; tcg_context?: string | null }) =>
    api.post("/chat/", data),

  getConversations: () => api.get("/chat/conversations"),

  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),

  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),

  streamMessage: (
    data: { conversation_id?: string; message: string; tcg_context?: string | null },
    onChunk: (chunk: string) => void,
    onDone: (conversationId: string | null) => void,
  ) => {
    // Same-origin request: the auth cookie is sent automatically
    return fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) {
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
          const chunk = line.slice(6).trim();
          if (!chunk) continue;
          if (chunk === "[DONE]") {
            onDone(conversationId); // always save conversation ID
            if (streamError) throw new Error(streamError);
            return;
          }
          if (chunk.startsWith("[ERROR]")) {
            streamError = chunk.slice(8); // buffer, don't throw yet
            continue;
          }
          onChunk(chunk);
        }
      }
    });
  },
};
