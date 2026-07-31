import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import { TRPCProvider } from "@/shared/lib/trpc/provider";
import { Nav } from "@/shared/ui/nav";
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TRPCProvider>
          <div className="grid min-h-screen grid-cols-[240px_1fr]">
            <Nav />
            <main className="overflow-x-hidden px-10 py-8">{children}</main>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
