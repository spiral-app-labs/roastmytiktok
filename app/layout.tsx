import type { Metadata } from "next";
import Link from "next/link";
import { Poppins, Ubuntu } from "next/font/google";
import AppNav from "@/components/AppNav";
import { Providers } from "@/components/Providers";
import { HomeJsonLd } from "@/components/JsonLd";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ubuntu",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('rmt-theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var resolvedTheme = stored === 'light' || stored === 'dark'
        ? stored
        : (systemDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
      document.documentElement.style.colorScheme = resolvedTheme;
    } catch (e) {}
  })();
`;

export const metadata: Metadata = {
  metadataBase: new URL("https://goviralwith.ai"),
  title: {
    default: "Go Viral - AI Agents Diagnose Why Your Videos Don't Spread",
    template: "%s | Go Viral",
  },
  description: "Six AI agents analyze your TikTok opener, diagnose why viewers leave, and give you a reshoot plan you can film today.",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ubuntu.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        <HomeJsonLd />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
        <Link
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-orange-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none"
        >
          Skip to main content
        </Link>
        <AppNav />
        <div id="main-content">
        {children}
        </div>
        </Providers>
      </body>
    </html>
  );
}
