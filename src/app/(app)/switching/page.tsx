'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function SwitchingInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pid = searchParams.get('pid')

  useEffect(() => {
    router.replace(`/home?pid=${pid}`)
  }, [pid])

  return null
}

export default function SwitchingPage() {
  return (
    <Suspense fallback={null}>
      <SwitchingInner />
    </Suspense>
  )
}