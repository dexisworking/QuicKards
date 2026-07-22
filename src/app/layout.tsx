// ============================================
// QUICKARDS — Root layout
// ============================================
//
// Sets fonts, base metadata, and the toast portal. Deliberately thin: the
// three route groups — (marketing), (auth), (app) — bring their own shells and
// theming. The <html> stays dark by default (marketing brand); the (app) group
// stamps [data-app-theme] on its own wrapper to switch into the light editor
// surface.

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://quickards.iamdex.codes",
  ),
  title: {
    default: "QuicKards — Bulk ID Card Generator",
    template: "%s · QuicKards",
  },
  description:
    "Design an ID card once, import a spreadsheet, and render a whole batch — a Canva-style editor with CSV mapping, photo matching, and print-ready output.",
  icons: {
    icon: "/favicon.ico",
    apple: "/quickards_favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
