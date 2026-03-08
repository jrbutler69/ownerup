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
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let project = null
  if (user) {
    const { data: projects } = await supabase
      .from('projects')
      .select('name, address')
      .eq('user_id', user.id)
      .limit(1)
    project = projects?.[0] ?? null
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F0EDE8' }}>
        {user ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ marginLeft: '200px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Persistent project header */}
              <header style={{
                padding: '48px 48px 0',
                fontFamily: "'DM Mono', monospace",
              }}>
                <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
                <p style={{
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#B0A898',
                  margin: '0 0 10px',
                  fontFamily: "'DM Mono', monospace",
                }}>Current Project</p>
                <h1 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 40,
                  fontWeight: 300,
                  color: '#1A1814',
                  margin: 0,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}>
                  {project?.name ?? '—'}
                </h1>
                {project?.address && (
                  <p style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    color: '#B0A898',
                    margin: '10px 0 0',
                    fontFamily: "'DM Mono', monospace",
                  }}>{project.address}</p>
                )}
                <div style={{
                  borderBottom: '1px solid #D8D2C8',
                  marginTop: 32,
                }} />
              </header>

              <main style={{ flex: 1, padding: '40px 48px 48px' }}>
                {children}
              </main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
