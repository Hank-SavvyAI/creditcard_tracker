'use client'

import { useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface MobileLayoutProps {
  children: ReactNode
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname()

  const tabs = [
    { id: 'dashboard', label: '我的卡片', icon: '💳', path: '/dashboard' },
    { id: 'cards', label: '探索', icon: '🔍', path: '/cards' },
    { id: 'profile', label: '我的', icon: '👤', path: '/profile' },
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
    }}>
      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
        WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom))',
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: '8px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        zIndex: 100,
      }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.path || pathname?.startsWith(tab.path + '/')
          return (
            <Link
              key={tab.id}
              href={tab.path}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: isActive ? '#667eea' : '#9ca3af',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: isActive ? '600' : '400',
              }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
