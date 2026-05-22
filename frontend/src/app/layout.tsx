import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TCGMentor — Learn Trading Card Games",
  description: "Your AI-powered guide to Trading Card Games. Learn Pokemon, Magic, Yu-Gi-Oh, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=JSON.parse(localStorage.getItem('tcgmentor_theme')||'{}');if(t.state?.theme==='dark')document.documentElement.classList.add('dark')}catch{}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
