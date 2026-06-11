"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from "@/assets/TCGMentor.png";
import { TCGSelector } from "./TCGSelector";
import { cn } from "@/lib/utils";
import type { ChatMessage, TCGContext } from "@/types";

interface Props {
  messages: ChatMessage[];
  streamingContent?: string;
  isStreaming?: boolean;
  tcgContext: TCGContext;
  onContextChange: (ctx: TCGContext) => void;
  onSuggestion: (text: string) => void;
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  tcgContext,
  onContextChange,
  onSuggestion,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center px-6 py-8">
        <Image src={logo} alt="TCGMentor" width={64} height={64} className="rounded-xl" />
        <div>
          <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
            Welcome to TCGMentor
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Your AI tutor for Trading Card Games
          </p>
        </div>
        <TCGSelector
          selected={tcgContext}
          onSelect={onContextChange}
          onSuggestion={onSuggestion}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col">
        {messages.map((msg, i) => (
          <MessageRow key={i} message={msg} />
        ))}
        {isStreaming && (
          <MessageRow
            message={{ role: "assistant", content: streamingContent ?? "" }}
            isStreaming
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageRow({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] bg-zinc-100 dark:bg-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6">
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800">
        <Image src={logo} alt="TCGMentor" width={28} height={28} className="object-cover" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-zinc-800 dark:text-zinc-100">
        <div
          className={cn(
            "prose prose-sm max-w-none",
            "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
            "prose-headings:text-zinc-800 prose-code:text-zinc-800 prose-strong:text-zinc-900",
            "dark:prose-invert",
            "dark:prose-headings:text-zinc-100 dark:prose-code:text-zinc-100 dark:prose-strong:text-zinc-100"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
