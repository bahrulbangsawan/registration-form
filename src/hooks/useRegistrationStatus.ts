'use client'

import { useState, useEffect, useCallback } from 'react'

export interface RegistrationStatus {
  isOpen: boolean
  message: string
  lastChecked: Date | null
}

export interface UseRegistrationStatusReturn {
  status: RegistrationStatus
  loading: boolean
  error: string | null
  checkStatus: () => Promise<void>
  setRegistrationOpen: (isOpen: boolean) => void
}

const DEFAULT_STATUS: RegistrationStatus = {
  isOpen: false,
  message: 'Registration will open soon. Get ready to secure your spot!',
  lastChecked: null
}

export function useRegistrationStatus(): UseRegistrationStatusReturn {
  const [status, setStatus] = useState<RegistrationStatus>(DEFAULT_STATUS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Check localStorage first for cached status
      const cachedStatus = localStorage.getItem('registration-status')
      if (cachedStatus) {
        const parsed = JSON.parse(cachedStatus)
        const cacheTime = new Date(parsed.lastChecked)
        const now = new Date()
        
        // Use cached status if less than 5 minutes old
        if (now.getTime() - cacheTime.getTime() < 5 * 60 * 1000) {
          setStatus({
            ...parsed,
            lastChecked: cacheTime
          })
          setLoading(false)
          return
        }
      }
      
      // Call the Google Apps Script backend to get registration status
      const gasUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
      if (!gasUrl) {
        throw new Error('Google Apps Script URL not configured')
      }
      
      const response = await fetch(`${gasUrl}?fn=registration-status`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to get registration status')
      }
      
      const newStatus: RegistrationStatus = {
        isOpen: data.isOpen,
        message: data.message,
        lastChecked: new Date(data.lastChecked)
      }
      
      // Cache the status
      localStorage.setItem('registration-status', JSON.stringify({
        ...newStatus,
        lastChecked: newStatus.lastChecked?.toISOString()
      }))
      
      setStatus(newStatus)
    } catch (err) {
      console.error('Failed to check registration status:', err)
      setError('Failed to check registration status')
      
      // Fallback to closed status on error
      setStatus({
        isOpen: false,
        message: 'Registration will open soon. Get ready to secure your spot!',
        lastChecked: new Date()
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const setRegistrationOpen = useCallback((isOpen: boolean) => {
    const newStatus: RegistrationStatus = {
      isOpen,
      message: isOpen 
        ? 'Registration is now open!' 
        : 'Registration will open soon. Get ready to secure your spot!',
      lastChecked: new Date()
    }
    
    setStatus(newStatus)
    
    // Cache the status
    localStorage.setItem('registration-status', JSON.stringify({
      ...newStatus,
      lastChecked: newStatus.lastChecked?.toISOString()
    }))
  }, [])

  // Check status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  return {
    status,
    loading,
    error,
    checkStatus,
    setRegistrationOpen
  }
}