import type { Metadata } from "next";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import { ApiProvider } from "@/lib/ApiState";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SETU — Crisis Logistics Grid",
  description:
    "When the network breaks, relief shouldn't. SETU is a crisis logistics reconciliation system that works offline, detects conflicts, and redistributes resources under zero-connectivity conditions.",
  keywords: ["crisis logistics", "offline-first", "disaster relief", "supply reconciliation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${spaceGrotesk.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-ui, 'Space Grotesk', system-ui, sans-serif)",
          backgroundColor: "var(--setu-paper, #F5F0E8)",
          color: "var(--setu-ink, #0F0E0C)",
        }}
      >
        <SwRegister />
        <ApiProvider>
          {children}
        </ApiProvider>
      </body>
    </html>
  );
}

