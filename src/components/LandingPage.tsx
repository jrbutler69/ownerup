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
        <p style={styles.eyebrow}>FOR ARCHITECTS, DESIGNERS, AND THEIR CLIENTS</p>
        <h1 style={styles.headline}>
          A live dashboard for every<br />residential project.
        </h1>
        <p style={styles.subheadline}>
          Metalog is a simple hub for renovations and new builds —<br />
          plans, photos, budgets, and renderings, always up to date.<br />
          NOW syncable and embeddable with Google Sheets.
        </p>
        <Link href="/signup" style={styles.heroCta}>Create your first project</Link>
      </section>

      {/* Screenshot */}
      <section style={styles.screenshotSection}>
        <div style={styles.screenshotFrame}>
          <img
            src="/screenshot.png"
            alt="Metalog project dashboard"
            style={styles.screenshot}
          />
        </div>
      </section>

      <div style={styles.divider} />

      {/* How it works */}
      <section style={styles.howItWorks}>
        <p style={styles.sectionLabel}>HOW IT WORKS</p>
        <div style={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} style={styles.step}>
              <p style={styles.stepNumber}>{s.number}</p>
              <p style={styles.stepTitle}>{s.title}</p>
              <p style={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* Features */}
      <section style={styles.features}>
        <p style={styles.sectionLabel}>WHAT'S INSIDE</p>
        <div style={styles.featureGrid}>
          {features.map((f, i) => (
            <div key={i} style={styles.feature}>
              <p style={styles.featureLabel}>{f.label}</p>
              <p style={styles.featureTitle}>{f.title}</p>
              <p style={styles.featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* Trust line */}
      <section style={styles.trust}>
        <p style={styles.trustText}>
          Works even if your contractor never logs in. No per-seat pricing. No complexity.
        </p>
      </section>

      <div style={styles.divider} />

      {/* Bottom CTA */}
      <section style={styles.bottom}>
        <h2 style={styles.bottomHeadline}>Start your first project today.</h2>
        <p style={styles.bottomBody}>Free to use. Takes 60 seconds to set up.</p>
        <Link href="/signup" style={styles.heroCta}>Create your account</Link>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerLogo}>METALOG</span>
        <div style={styles.footerRight}>
          <span style={styles.footerText}>© 2026 Metalog. All rights reserved.</span>
          <span style={styles.footerDot}>·</span>
          <Link href="/terms" style={styles.footerLink}>Terms</Link>
          <span style={styles.footerDot}>·</span>
          <Link href="/privacy" style={styles.footerLink}>Privacy</Link>
        </div>
      </footer>

    </div>
  )
}

const steps = [
  {
    number: '01',
    title: 'Create a project.',
    body: 'Add the project name, address, and your team. Takes 60 seconds.',
  },
  {
    number: '02',
    title: 'Upload as you go.',
    body: 'Drop in drawings, photos, and renderings as the project progresses.',
  },
  {
    number: '03',
    title: 'Invite your client.',
    body: 'They get a clean, read-only view of everything you\'ve shared. No training required.',
  },
]

const features = [
  {
    label: '01',
    title: 'Drawings, always current.',
    body: 'Upload new versions of any document. The latest is always front and center.',
  },
  {
    label: '02',
    title: 'Site photos by visit.',
    body: 'Document progress with photos grouped by episode. Clients can follow along in real time.',
  },
  {
    label: '03',
    title: 'Renderings, in context.',
    body: 'A dedicated space for architectural renderings, separate from site photography.',
  },
  {
    label: '04',
    title: 'Granular permissions.',
    body: 'Control exactly what each person can see and edit. Clients see what you share. Nothing more.',
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
    padding: '120px 64px 80px',
    maxWidth: '860px',
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
    lineHeight: 1.9,
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
  screenshotSection: {
    padding: '0 64px 80px',
  },
  screenshotFrame: {
    border: '1px solid #D8D2C8',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  },
  screenshot: {
    width: '100%',
    display: 'block',
  },
  divider: {
    borderTop: '1px solid #E0D9D0',
    margin: '0 64px',
  },
  sectionLabel: {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#C9B99A',
    marginBottom: '48px',
  },
  howItWorks: {
    padding: '80px 64px',
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '64px',
  },
  step: {
    borderTop: '1px solid #E0D9D0',
    paddingTop: '24px',
  },
  stepNumber: {
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: '#C9B99A',
    marginBottom: '16px',
  },
  stepTitle: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '22px',
    color: '#151412',
    margin: '0 0 12px 0',
    lineHeight: 1.3,
  },
  stepBody: {
    fontSize: '11px',
    lineHeight: 1.8,
    color: '#888',
    margin: 0,
  },
  features: {
    padding: '80px 64px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '40px',
  },
  feature: {
    borderTop: '1px solid #E0D9D0',
    paddingTop: '24px',
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
  trust: {
    padding: '64px 64px',
  },
  trustText: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '28px',
    fontWeight: 300,
    fontStyle: 'italic',
    color: '#7A7468',
    margin: 0,
    lineHeight: 1.6,
    maxWidth: '640px',
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
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  footerText: {
    fontSize: '10px',
    color: '#999',
    letterSpacing: '0.04em',
  },
  footerDot: {
    fontSize: '10px',
    color: '#CCC',
  },
  footerLink: {
    fontSize: '10px',
    color: '#999',
    letterSpacing: '0.04em',
    textDecoration: 'none',
  },
}
