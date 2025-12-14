import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Footer from "@/components/Footer";
import { DebugProvider } from "@/contexts/DebugContext";
import DebugPanel from "@/components/DebugPanel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Tutor - Learn Chess with AI",
  description: "Learn chess with AI-powered tutoring from Gemini and Stockfish engine analysis",
};

// Force dynamic rendering to read environment variables at runtime
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <DebugProvider>
          {children}
          <Footer />
          <DebugPanel />
        </DebugProvider>
      </body>
    </html>
  );
}
