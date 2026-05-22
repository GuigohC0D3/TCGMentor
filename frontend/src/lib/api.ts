import axios from "axios";
import { useAuthStore } from "@/stores/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") window.location.href = "/login";
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
    token: string,
    onChunk: (chunk: string) => void,
    onDone: (conversationId: string | null) => void,
  ) => {
    return fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Stream failed: ${res.status}`);
      }
      const conversationId = res.headers.get("X-Conversation-Id");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (chunk === "[DONE]") { onDone(conversationId); return; }
          if (chunk.startsWith("[ERROR]")) throw new Error(chunk.slice(8));
          onChunk(chunk);
        }
      }
    });
  },
};
