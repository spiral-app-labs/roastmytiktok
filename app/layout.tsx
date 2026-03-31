import type { Metadata } from "next";
import AppNav from "@/components/AppNav";
import { Providers } from "@/components/Providers";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">
        <Providers>
        <AppNav />
        {children}
        <footer className="mt-auto border-t border-zinc-900 px-6 py-4 flex items-center justify-between text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Spiral App Labs</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-orange-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-orange-400 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </footer>
        </Providers>
      </body>
    </html>
  );
}
