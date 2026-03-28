import type { Metadata } from "next";
import AppNav from "@/components/AppNav";
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
        <AppNav />
        {children}
      </body>
    </html>
  );
}
