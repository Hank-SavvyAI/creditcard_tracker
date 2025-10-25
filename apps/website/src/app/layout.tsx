'use client'

import { useEffect } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import '../lib/i18n'
import { useThemeStore } from '@/store/theme'
import { useLanguageStore } from '@/store/language'
import { useTranslation } from 'react-i18next'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useThemeStore()
  const { language } = useLanguageStore()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    
    // Change language
    i18n.changeLanguage(language)
  }, [theme, language, i18n])

  return (
    <html lang={language} className={theme}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
