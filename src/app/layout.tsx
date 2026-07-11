import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evalora | AI Candidate Assessment Platform",
  description: "AI-powered candidate assessment platform for technical, behavioral, and leadership evaluation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=localStorage.getItem("evalora-theme")||"light";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme==="dark"?"dark":"light"}catch(e){}`,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
