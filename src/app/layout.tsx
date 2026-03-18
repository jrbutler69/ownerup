import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metalog",
  description: "Track your construction project",
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