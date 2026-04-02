import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <Link href="/" style={styles.logo}>METALOG</Link>
      </nav>
      <main style={styles.main}>
        <p style={styles.eyebrow}>LEGAL</p>
        <h1 style={styles.headline}>Terms of Service</h1>
        <p style={styles.meta}>Effective date: April 2, 2026</p>

        <div style={styles.body}>
          <p>Metalog ("we," "our," or "us") provides a project dashboard platform for residential architecture and construction projects. By creating an account or using metalog.app, you agree to these terms.</p>

          <h2 style={styles.h2}>1. Use of Service</h2>
          <p>Metalog is intended for use by architects, designers, contractors, and their clients to organize project documents, photos, and communications. You agree to use the service only for lawful purposes.</p>

          <h2 style={styles.h2}>2. Your Account</h2>
          <p>You are responsible for maintaining the security of your account and password. You are responsible for all activity that occurs under your account.</p>

          <h2 style={styles.h2}>3. Your Content</h2>
          <p>You retain ownership of all content you upload to Metalog. By uploading content, you grant us a limited license to store and display that content to you and the collaborators you invite. We do not share your content with third parties.</p>

          <h2 style={styles.h2}>4. Service Availability</h2>
          <p>We will make reasonable efforts to keep Metalog available, but we do not guarantee uninterrupted access. The service is provided "as is" without warranties of any kind.</p>

          <h2 style={styles.h2}>5. Termination</h2>
          <p>You may delete your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.</p>

          <h2 style={styles.h2}>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Metalog is not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

          <h2 style={styles.h2}>7. Changes to These Terms</h2>
          <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>

          <h2 style={styles.h2}>8. Contact</h2>
          <p>Questions about these terms? Email us at <a href="mailto:hello@metalog.app" style={styles.link}>hello@metalog.app</a>.</p>
        </div>

        <p style={styles.copyright}>© 2026 Metalog. All rights reserved. Metalog is a trademark of its respective owner.</p>
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
