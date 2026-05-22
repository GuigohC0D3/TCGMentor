import { create } from "zustand";
import type { ChatMessage, ConversationSummary, TCGContext } from "@/types";

interface ChatStore {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  tcgContext: TCGContext;
  error: string | null;

  setConversations: (convs: ConversationSummary[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setTcgContext: (ctx: TCGContext) => void;
  setError: (error: string | null) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finishStreaming: (conversationId: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  tcgContext: null,
  error: null,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], error: null }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setTcgContext: (tcgContext) => set({ tcgContext }),

  setError: (error) => set({ error }),

  startStreaming: () => set({ isStreaming: true, streamingContent: "", error: null }),

  appendStreamChunk: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finishStreaming: (conversationId) => {
    const { streamingContent, messages, activeConversationId } = get();
    set({
      isStreaming: false,
      streamingContent: "",
      messages: [...messages, { role: "assistant", content: streamingContent }],
      // Only update if we received a valid ID; keep existing otherwise
      activeConversationId: conversationId || activeConversationId,
    });
  },

  reset: () =>
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      tcgContext: null,
    }),
}));
