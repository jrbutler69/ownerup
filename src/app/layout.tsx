import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metalog — Project Dashboard for Architects and Their Clients",
  description: "Metalog is a project dashboard for residential architects and their clients. One place for drawings, photos, renderings, and decisions. Free to use.",
  metadataBase: new URL("https://metalog.app"),
  openGraph: {
    title: "Metalog — Project Dashboard for Architects and Their Clients",
    description: "One place for drawings, photos, renderings, and decisions. Built for residential architects and their clients.",
    url: "https://metalog.app",
    siteName: "Metalog",
    images: [
      {
        url: "/screenshot.png",
        width: 1200,
        height: 800,
        alt: "Metalog project dashboard",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metalog — Project Dashboard for Architects and Their Clients",
    description: "One place for drawings, photos, renderings, and decisions. Built for residential architects and their clients.",
    images: ["/screenshot.png"],
  },
  keywords: [
    "architect project dashboard",
    "construction project management",
    "residential architecture",
    "client portal for architects",
    "project photos and drawings",
    "construction dashboard",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F0EDE8' }}>
        {children}
      </body>
    </html>
  )
}
