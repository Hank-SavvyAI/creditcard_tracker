import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Credit Card Tracker',
  description: '信用卡福利追蹤工具',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#667eea',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CC Tracker',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>{children}</body>
    </html>
  )
}
