'use client'

import { useLanguageStore } from '@/store/language'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguageStore()
  const { i18n } = useTranslation()

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language, i18n])

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium"
      aria-label="Toggle language"
    >
      {language === 'en' ? '中文' : 'English'}
    </button>
  )
}
