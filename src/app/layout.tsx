import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import { TRPCProvider } from "@/shared/lib/trpc/provider";
import { Nav } from "@/shared/ui/nav";
import { RegisterServiceWorker } from "@/shared/ui/register-sw";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance OS",
  description: "Net worth first. Everything else is an input to it.",
  appleWebApp: {
    // iOS ignores the web manifest's display mode; these give it a
    // full-screen launch with no browser chrome.
    capable: true,
    title: "Finance OS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // The system is dark-only (Section 13), so tell the browser outright.
  colorScheme: "dark",
  // Stops iOS zooming the page when a form field is focused.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/* Safe-area padding keeps the nav clear of the iOS notch/home bar. */}
      <body className="min-h-full flex flex-col bg-background text-foreground [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
        <RegisterServiceWorker />
        <TRPCProvider>
          {/* Sidebar on a laptop; nav collapses to a top bar on phones. */}
          <div className="flex min-h-screen flex-col md:grid md:grid-cols-[240px_1fr]">
            <Nav />
            <main className="min-w-0 overflow-x-hidden px-5 py-6 md:px-10 md:py-8">
              {children}
            </main>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
