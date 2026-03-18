import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={styles.root}>

      {/* Nav */}
      <nav style={styles.nav}>
        <span style={styles.logo}>METALOG</span>
        <div style={styles.navLinks}>
          <Link href="/login" style={styles.navLink}>Sign in</Link>
          <Link href="/signup" style={styles.navCta}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={styles.hero}>
        <p style={styles.eyebrow}>FOR ARCHITECTS AND OWNERS BUILDING OR RENOVATING</p>
        <h1 style={styles.headline}>
          Your construction project,<br />organized.
        </h1>
        <p style={styles.subheadline}>
          One place for every drawing, decision, photo, and dollar.<br />
          Built for architects and owners. Works even if your contractor never logs in.
        </p>
        <Link href="/signup" style={styles.heroCta}>Start for free</Link>
      </section>

      <div style={styles.divider} />

      {/* Features */}
      <section style={styles.features}>
        {features.map((f, i) => (
          <div key={i} style={styles.feature}>
            <p style={styles.featureLabel}>{f.label}</p>
            <p style={styles.featureTitle}>{f.title}</p>
            <p style={styles.featureBody}>{f.body}</p>
          </div>
        ))}
      </section>

      <div style={styles.divider} />

      {/* Bottom CTA */}
      <section style={styles.bottom}>
        <h2 style={styles.bottomHeadline}>Ready to get organized?</h2>
        <p style={styles.bottomBody}>Create your free account in 30 seconds.</p>
        <Link href="/signup" style={styles.heroCta}>Create your account</Link>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerLogo}>METALOG</span>
        <span style={styles.footerText}>© 2026</span>
      </footer>

    </div>
  )
}

const features = [
  {
    label: '01',
    title: 'Every document, versioned.',
    body: 'Upload contracts, drawings, permits, and specs. Always know which version is current.',
  },
  {
    label: '02',
    title: 'Photos by site visit.',
    body: 'Document progress with photos grouped by week and visit. Lightbox viewer included.',
  },
  {
    label: '03',
    title: 'Decisions, logged.',
    body: 'Record what was decided, when, and what it cost. Never wonder why something changed.',
  },
  {
    label: '04',
    title: 'Your team, in one place.',
    body: 'Architects, contractors, engineers, vendors — all their contact info, organized by role.',
  },
]

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#F0EDE8',
    fontFamily: '"DM Mono", monospace',
    color: '#151412',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px 64px',
    borderBottom: '1px solid #E0D9D0',
  },
  logo: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '18px',
    letterSpacing: '0.2em',
    color: '#151412',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: '#666',
    textDecoration: 'none',
  },
  navCta: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: '#F0EDE8',
    backgroundColor: '#151412',
    padding: '10px 20px',
    textDecoration: 'none',
    borderRadius: '2px',
  },
  hero: {
    padding: '120px 64px 100px',
    maxWidth: '800px',
  },
  eyebrow: {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#C9B99A',
    marginBottom: '24px',
  },
  headline: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '64px',
    fontWeight: 400,
    lineHeight: 1.1,
    color: '#151412',
    margin: '0 0 28px 0',
    letterSpacing: '-0.02em',
  },
  subheadline: {
    fontSize: '13px',
    lineHeight: 1.8,
    color: '#666',
    margin: '0 0 40px 0',
  },
  heroCta: {
    display: 'inline-block',
    fontSize: '11px',
    letterSpacing: '0.12em',
    color: '#F0EDE8',
    backgroundColor: '#151412',
    padding: '14px 32px',
    textDecoration: 'none',
    borderRadius: '2px',
  },
  divider: {
    borderTop: '1px solid #E0D9D0',
    margin: '0 64px',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0',
    padding: '80px 64px',
  },
  feature: {
    padding: '0 40px 0 0',
    borderRight: '1px solid #E0D9D0',
    marginRight: '40px',
  },
  featureLabel: {
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: '#C9B99A',
    marginBottom: '16px',
  },
  featureTitle: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '20px',
    color: '#151412',
    margin: '0 0 12px 0',
    lineHeight: 1.3,
  },
  featureBody: {
    fontSize: '11px',
    lineHeight: 1.8,
    color: '#888',
    margin: 0,
  },
  bottom: {
    padding: '100px 64px',
    maxWidth: '600px',
  },
  bottomHeadline: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '48px',
    fontWeight: 400,
    color: '#151412',
    margin: '0 0 16px 0',
    letterSpacing: '-0.02em',
  },
  bottomBody: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '36px',
    lineHeight: 1.8,
  },
  footer: {
    borderTop: '1px solid #E0D9D0',
    padding: '28px 64px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '14px',
    letterSpacing: '0.2em',
    color: '#999',
  },
  footerText: {
    fontSize: '10px',
    color: '#999',
    letterSpacing: '0.08em',
  },
}