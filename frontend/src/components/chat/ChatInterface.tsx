"use client";

import { useState } from "react";
import { AlertCircle, X, RotateCcw } from "lucide-react";
import { chatApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";
import type { TCGContext } from "@/types";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";

const TCG_LABELS: Record<string, string> = {
  pokemon:  "🔴 Pokémon",
  magic:    "⚔️ Magic",
  yugioh:   "⭐ Yu-Gi-Oh!",
  lorcana:  "🎭 Lorcana",
  onepiece: "⚓ One Piece",
};

export function ChatInterface() {
  const { token } = useAuthStore();
  const {
    messages,
    isStreaming,
    streamingContent,
    activeConversationId,
    tcgContext,
    error,
    addMessage,
    startStreaming,
    appendStreamChunk,
    finishStreaming,
    setTcgContext,
    setError,
  } = useChatStore();

  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const handleSend = async (message: string) => {
    if (!token) return;

    setLastMessage(message);
    addMessage({ role: "user", content: message });
    startStreaming();

    try {
      await chatApi.streamMessage(
        {
          conversation_id: activeConversationId ?? undefined,
          message,
          tcg_context: tcgContext,
        },
        token,
        (chunk) => appendStreamChunk(chunk),
        (conversationId) => finishStreaming(conversationId),
      );
    } catch (err) {
      finishStreaming(activeConversationId);
      const raw = err instanceof Error ? err.message : String(err);
      // Strip technical prefixes for cleaner display
      const display = raw.replace(/^Stream failed: \d+\s*/, "").trim();
      setError(display || "Falha ao conectar com a IA. Tente novamente.");
    }
  };

  const handleRetry = () => {
    if (!lastMessage) return;
    setError(null);
    handleSend(lastMessage);
  };

  const handleContextChange = (ctx: TCGContext) => {
    if (messages.length === 0) setTcgContext(ctx);
  };

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900">
      {hasMessages && tcgContext && (
        <div className="flex-shrink-0 flex items-center justify-center py-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1">
            {TCG_LABELS[tcgContext]}
          </span>
        </div>
      )}

      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        tcgContext={tcgContext}
        onContextChange={handleContextChange}
        onSuggestion={handleSend}
      />

      {error && (
        <div className="flex-shrink-0 mx-auto w-full max-w-3xl px-6 pb-2">
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1 break-words">{error}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {lastMessage && (
                <button
                  onClick={handleRetry}
                  title="Tentar novamente"
                  className="p-1 hover:opacity-70 transition-opacity"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setError(null)} className="p-1 hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        disabled={isStreaming}
        tcgContext={tcgContext}
        hasMessages={hasMessages}
      />
    </div>
  );
}
