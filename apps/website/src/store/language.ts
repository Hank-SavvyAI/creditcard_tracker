import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'en' | 'zh'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === 'en' ? 'zh' : 'en' }),
    }),
    {
      name: 'language-storage',
    }
  )
)
