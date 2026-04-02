import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <Link href="/" style={styles.logo}>METALOG</Link>
      </nav>
      <main style={styles.main}>
        <p style={styles.eyebrow}>LEGAL</p>
        <h1 style={styles.headline}>Privacy Policy</h1>
        <p style={styles.meta}>Effective date: April 2, 2026</p>

        <div style={styles.body}>
          <p>Metalog is committed to protecting your privacy. This policy explains what information we collect, how we use it, and how we protect it.</p>

          <h2 style={styles.h2}>1. Information We Collect</h2>
          <p>We collect information you provide directly: your name, email address, and the project content you upload (documents, photos, renderings, and notes). We also collect basic usage data such as login timestamps.</p>

          <h2 style={styles.h2}>2. How We Use Your Information</h2>
          <p>We use your information solely to provide the Metalog service — to authenticate your account, display your project content to you and your invited collaborators, and send transactional emails (such as invite notifications and password resets).</p>

          <h2 style={styles.h2}>3. Data Sharing</h2>
          <p>We do not sell your personal information. We do not share your content or account data with third parties except as required to operate the service (e.g. our hosting provider, Vercel, and our database provider, Supabase). These providers are bound by their own privacy policies and data processing agreements.</p>

          <h2 style={styles.h2}>4. Data Storage</h2>
          <p>Your data is stored on servers provided by Supabase (database and file storage) and Vercel (application hosting). All data is stored in the United States.</p>

          <h2 style={styles.h2}>5. Cookies</h2>
          <p>Metalog uses a single session cookie to keep you logged in and to remember which project you are currently viewing. We do not use advertising or tracking cookies.</p>

          <h2 style={styles.h2}>6. Data Retention</h2>
          <p>Your data is retained as long as your account exists. When you delete your account or project, all associated data is permanently deleted. We do not retain backups of deleted content.</p>

          <h2 style={styles.h2}>7. Your Rights</h2>
          <p>You can access, correct, or delete your data at any time by logging into your account or contacting us. You can delete your project and all associated data from within the app.</p>

          <h2 style={styles.h2}>8. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify users of material changes by email.</p>

          <h2 style={styles.h2}>9. Contact</h2>
          <p>Questions about privacy? Email us at <a href="mailto:hello@metalog.app" style={styles.link}>hello@metalog.app</a>.</p>
        </div>

        <p style={styles.copyright}>© 2026 Metalog. All rights reserved.</p>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#F0EDE8',
    fontFamily: '"DM Mono", monospace',
    color: '#151412',
  },
  nav: {
    padding: '28px 64px',
    borderBottom: '1px solid #E0D9D0',
  },
  logo: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '18px',
    letterSpacing: '0.2em',
    color: '#151412',
    textDecoration: 'none',
  },
  main: {
    maxWidth: '680px',
    padding: '80px 64px 120px',
  },
  eyebrow: {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#C9B99A',
    marginBottom: '24px',
  },
  headline: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '48px',
    fontWeight: 400,
    color: '#151412',
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
  },
  meta: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '48px',
  },
  body: {
    fontSize: '12px',
    lineHeight: 1.9,
    color: '#444',
  },
  h2: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '22px',
    fontWeight: 400,
    color: '#151412',
    margin: '40px 0 12px 0',
  },
  link: {
    color: '#151412',
  },
  copyright: {
    fontSize: '10px',
    color: '#999',
    marginTop: '64px',
    letterSpacing: '0.04em',
  },
}
