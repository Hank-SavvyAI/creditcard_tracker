'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8443'

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  const STORAGE_KEY = 'analytics_session_id'
  let sessionId = sessionStorage.getItem(STORAGE_KEY)

  if (!sessionId) {
    // Generate UUID v4
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    sessionStorage.setItem(STORAGE_KEY, sessionId)
  }

  return sessionId
}

// Detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

// Track page view
async function trackPageView(page: string, referrer?: string) {
  try {
    const user = localStorage.getItem('user')
    const userId = user ? JSON.parse(user).id : null

    const sessionId = getSessionId()
    const device = getDeviceType()
    const userAgent = navigator.userAgent

    await fetch(`${BACKEND_URL}/api/analytics/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        sessionId,
        page,
        referrer: referrer || document.referrer,
        userAgent,
        device,
      }),
    })

    console.log(`📊 Tracked page view: ${page}`)
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.error('Failed to track page view:', error)
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const previousPathRef = useRef<string>('')

  useEffect(() => {
    // Track page view on mount and when pathname changes
    if (pathname && pathname !== previousPathRef.current) {
      const referrer = previousPathRef.current || undefined
      trackPageView(pathname, referrer)
      previousPathRef.current = pathname
    }
  }, [pathname])

  // This component doesn't render anything
  return null
}
