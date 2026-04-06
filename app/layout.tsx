import type { Metadata } from "next";
import AppNav from "@/components/AppNav";
import { Providers } from "@/components/Providers";
import Link from "next/link";
import { HomeJsonLd } from "@/components/JsonLd";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://goviralwith.ai"),
  title: {
    default: "Go Viral — AI Agents Diagnose Why Your Videos Don't Spread",
    template: "%s | Go Viral",
  },
  description: "Six AI agents analyze your TikTok opener, diagnose why viewers leave, and give you a reshoot plan you can film today.",
  manifest: "/manifest.json",
  themeColor: "#fb923c",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        <HomeJsonLd />
      </head>
      <body className="min-h-full flex flex-col bg-[#09090b] text-white">
        <Providers>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-orange-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none"
        >
          Skip to main content
        </a>
        <AppNav />
        <div id="main-content">
        {children}
        </div>
        </Providers>
      </body>
    </html>
  );
}
