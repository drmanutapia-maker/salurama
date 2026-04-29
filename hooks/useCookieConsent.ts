'use client'

import { useState, useEffect } from 'react'

type CookieCategory = 'necessary' | 'analytics' | 'functionality'

interface CookieConsent {
  necessary: boolean
  analytics: boolean
  functionality: boolean
}

const COOKIE_CONSENT_KEY = 'cookie-consent'
const COOKIE_EXPIRY_DAYS = 365

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isBannerVisible, setIsBannerVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Reset por URL para desarrollo: ?reset-cookies
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset-cookies')) {
      localStorage.removeItem(COOKIE_CONSENT_KEY)
      document.cookie = `${COOKIE_CONSENT_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      setConsent(null)
      setIsBannerVisible(true)
      // Limpiar URL sin recargar
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConsent(parsed)
      } catch {
        setIsBannerVisible(true)
      }
    } else {
      setIsBannerVisible(true)
    }
  }, [])

  const saveConsent = (newConsent: CookieConsent) => {
    setConsent(newConsent)
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
    
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + COOKIE_EXPIRY_DAYS)
    document.cookie = `${COOKIE_CONSENT_KEY}=true; expires=${expiry.toUTCString()}; path=/`
    
    setIsBannerVisible(false)
  }

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      functionality: true,
    })
  }

  const rejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      functionality: false,
    })
  }

  const openBanner = () => {
    setIsBannerVisible(true)
  }

  const closeBanner = () => {
    setIsBannerVisible(false)
  }

  return {
    consent,
    isBannerVisible,
    acceptAll,
    rejectAll,
    saveConsent,
    openBanner,
    closeBanner,
    hasConsented: consent !== null,
  }
}