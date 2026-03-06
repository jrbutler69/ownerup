import type { Metadata } from "next";
import "./globals.css";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: "OwnerUp",
  description: "Track your home construction project",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {
          // Layouts cannot set cookies — handled by middleware
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#f5f2ee' }}>
        {user ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ marginLeft: '200px', flex: 1, padding: '48px' }}>
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
