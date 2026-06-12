import { AuthGuard } from "@/components/AuthGuard";
import { DecksView } from "@/components/decks/DecksView";

export const metadata = { title: "My Decks — TCGMentor" };

export default function DecksPage() {
  return (
    <AuthGuard>
      <DecksView />
    </AuthGuard>
  );
}
