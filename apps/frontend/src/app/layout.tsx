import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Credit Card Benefits Tracker',
  description: 'Track your credit card benefits and rewards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <Header />
        {children}
      </body>
    </html>
  )
}
