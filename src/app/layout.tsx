import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evalora | AI Candidate Assessment Platform",
  description: "AI-powered candidate assessment platform for technical, behavioral, and leadership evaluation.",
  icons: {
    icon: [{ url: "/evalora-mark.png", type: "image/png" }],
    shortcut: "/evalora-mark.png",
    apple: "/evalora-mark.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline theme script sets data-theme / color-scheme
    // from localStorage before React hydrates, so server HTML intentionally differs.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run in <head>, before the browser can paint. From <body> the
            stylesheet is already applied, so the first frame can show the
            default light theme before data-theme is set. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("evalora-theme");if(t!=="dark"&&t!=="ocean"&&t!=="light")t="light";var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t==="dark"?"dark":"light"}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
