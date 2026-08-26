import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "BodhAI — Intelligence, Made Understandable",
  description:
    "BodhAI is a modern AI assistant designed to help you learn, create, code, and understand complex ideas.",
  keywords: ["AI assistant", "BodhAI", "Cloudflare Workers AI", "Open-source LLM", "Code assistant", "Learning AI"],
  authors: [{ name: "BodhAI Team" }],
  openGraph: {
    title: "BodhAI — Intelligence, Made Understandable",
    description: "Meet BodhAI — a modern AI assistant built to help you think, learn, create, and solve.",
    url: "https://bodhai.com",
    siteName: "BodhAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BodhAI — Intelligence, Made Understandable",
    description: "Meet BodhAI — a modern AI assistant built to help you think, learn, create, and solve.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

