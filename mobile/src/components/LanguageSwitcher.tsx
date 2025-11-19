'use client'

import { useEffect, useState } from 'react'
import { useLanguageStore } from '@/store/language'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="language-switcher">
        <button className="lang-btn">中文</button>
        <button className="lang-btn">EN</button>
      </div>
    )
  }

  return (
    <div className="language-switcher">
      <button
        onClick={() => setLanguage('zh-TW')}
        className={`lang-btn ${language === 'zh-TW' ? 'active' : ''}`}
      >
        中文
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
      >
        EN
      </button>
    </div>
  )
}
