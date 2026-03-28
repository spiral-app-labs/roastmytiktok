import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roast My TikTok — AI Agents Roast Your Content",
  description: "Your TikTok is cringe. Watch AI prove it. 6 specialized AI agents analyze and brutally roast your TikTok videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">
        <nav className="flex items-center justify-between px-6 py-3 border-b border-zinc-900">
          <Link href="/" className="text-sm font-bold fire-text">Roast My TikTok</Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
              Pricing
            </Link>
            <Link href="/monitoring" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
              📡 Monitoring
            </Link>
            <Link href="/history" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
              📋 History
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
