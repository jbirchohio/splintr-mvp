'use client'

import { useState, useEffect } from 'react'

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

interface CookieConsentData {
  preferences: CookiePreferences
  consentDate: string | null
  hasConsented: boolean
}

export function useCookieConsent() {
  const [consentData, setConsentData] = useState<CookieConsentData>({
    preferences: {
      essential: true,
      analytics: false,
      marketing: false
    },
    consentDate: null,
    hasConsented: false
  })

  useEffect(() => {
    // Check for existing consent
    const consent = localStorage.getItem('splintr-cookie-consent')
    const consentDate = localStorage.getItem('splintr-cookie-consent-date')

    if (consent && consentDate) {
      try {
        const preferences = JSON.parse(consent)
        setConsentData({
          preferences,
          consentDate,
          hasConsented: true
        })
      } catch (error) {
        console.error('Error parsing cookie consent:', error)
      }
    }
  }, [])

  const updateConsent = (preferences: CookiePreferences) => {
    const consentDate = new Date().toISOString()
    
    localStorage.setItem('splintr-cookie-consent', JSON.stringify(preferences))
    localStorage.setItem('splintr-cookie-consent-date', consentDate)
    
    setConsentData({
      preferences,
      consentDate,
      hasConsented: true
    })

    // Initialize tracking based on preferences
    if (preferences.analytics) {
      initializeAnalytics()
    }

    if (preferences.marketing) {
      initializeMarketing()
    }
  }

  const clearConsent = () => {
    localStorage.removeItem('splintr-cookie-consent')
    localStorage.removeItem('splintr-cookie-consent-date')
    
    setConsentData({
      preferences: {
        essential: true,
        analytics: false,
        marketing: false
      },
      consentDate: null,
      hasConsented: false
    })
  }

  const canUseAnalytics = () => {
    return consentData.hasConsented && consentData.preferences.analytics
  }

  const canUseMarketing = () => {
    return consentData.hasConsented && consentData.preferences.marketing
  }

  return {
    ...consentData,
    updateConsent,
    clearConsent,
    canUseAnalytics,
    canUseMarketing
  }
}

// Helper functions for initializing tracking
function initializeAnalytics() {
  // Initialize analytics tracking here
  // For example, Google Analytics, Mixpanel, etc.
  console.log('Analytics tracking initialized')
  
  // Example: Initialize Google Analytics
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('consent', 'update', {
  //     analytics_storage: 'granted'
  //   })
  // }
}

function initializeMarketing() {
  // Initialize marketing tracking here
  // For example, Facebook Pixel, advertising cookies, etc.
  console.log('Marketing tracking initialized')
  
  // Example: Initialize Facebook Pixel
  // if (typeof window !== 'undefined' && window.fbq) {
  //   window.fbq('consent', 'grant')
  // }
}