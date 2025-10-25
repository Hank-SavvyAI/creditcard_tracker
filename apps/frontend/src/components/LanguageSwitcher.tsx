'use client'

import { useLanguageStore } from '@/store/language'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="language-switcher">
      <button
        onClick={() => setLanguage('zh-TW')}
        className={`lang-btn ${language === 'zh-TW' ? 'active' : ''}`}
      >
        繁中
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
