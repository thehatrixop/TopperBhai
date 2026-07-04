'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dictionaries, Language } from './dictionaries'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof dictionaries['en']) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Load language from localStorage on client side mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang === 'en' || savedLang === 'hi') {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: keyof typeof dictionaries['en']): string => {
    const dict = dictionaries[language] || dictionaries['en']
    return dict[key] || dictionaries['en'][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
