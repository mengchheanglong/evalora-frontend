import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evalora | AI Candidate Assessment Platform",
  description: "AI-powered candidate assessment platform for technical, behavioral, and leadership evaluation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
