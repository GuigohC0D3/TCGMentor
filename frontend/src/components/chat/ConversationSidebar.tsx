"use client";

import { useEffect, useState } from "react";
import { PenSquare, MessageSquare, Trash2, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logo from "@/assets/TCGMentor.png";
import { chatApi } from "@/lib/api";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function ConversationSidebar() {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversation,
    setMessages,
    setTcgContext,
    isStreaming,
    reset,
  } = useChatStore();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || isStreaming) return;
    chatApi.getConversations().then((res) => setConversations(res.data)).catch(() => {});
  }, [token, isStreaming]);

  const handleSelect = async (id: string) => {
    if (activeConversationId === id) return;
    setActiveConversation(id);
    if (!token) return;
    try {
      const res = await chatApi.getConversation(id);
      setMessages(res.data.messages ?? []);
      setTcgContext(res.data.tcg_context ?? null);
    } catch {}
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await chatApi.deleteConversation(id);
      setConversations(conversations.filter((c) => c.id !== id));
      if (activeConversationId === id) reset();
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <Image src={logo} alt="TCGMentor" width={22} height={22} className="rounded-sm" />
          TCGMentor
        </span>
        <ThemeToggle />
      </div>

      <div className="px-3 mb-2 flex-shrink-0">
        <button
          onClick={reset}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <PenSquare className="h-4 w-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 px-3 py-8 text-center">
            No conversations yet
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center rounded-lg transition-colors",
                activeConversationId === conv.id
                  ? "bg-zinc-200 dark:bg-zinc-800"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              )}
            >
              <button
                onClick={() => handleSelect(conv.id)}
                className="flex flex-1 min-w-0 items-center gap-2 px-3 py-2 text-sm text-left"
              >
                <MessageSquare
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 opacity-60",
                    activeConversationId === conv.id
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400"
                  )}
                />
                <span
                  className={cn(
                    "truncate",
                    activeConversationId === conv.id
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {conv.title ?? conv.last_message ?? "New conversation"}
                </span>
              </button>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                disabled={deletingId === conv.id}
                className="mr-2 flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all disabled:opacity-30"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {user?.full_name ?? user?.email ?? "User"}
            </p>
            {user?.full_name && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={() => { logout(); router.replace("/login"); }}
            aria-label="Sign out"
            className="flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
