export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ margin: 0, padding: 0, background: '#F0EDE8', minHeight: '100vh' }}>
      {children}
    </div>
  )
}