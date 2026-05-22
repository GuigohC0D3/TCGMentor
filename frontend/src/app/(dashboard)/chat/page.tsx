import { ChatInterface } from "@/components/chat/ChatInterface";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { AuthGuard } from "@/components/AuthGuard";

export const metadata = { title: "Chat — TCGMentor" };

export default function ChatPage() {
  return (
    <AuthGuard>
      <div className="h-screen flex bg-white dark:bg-zinc-900 overflow-hidden">
        <ConversationSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatInterface />
        </main>
      </div>
    </AuthGuard>
  );
}
