'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface Schedule {
  activity_id: string
  branch: string
  class_category: string
  activity_name: string
  total_slot: number
  booked_slot: number
  available_slot: number
}

export interface UseSchedulesReturn {
  schedules: Schedule[]
  loading: boolean
  error: string | null
  refetch: (branch?: string) => void
  getSchedulesByCategory: (category: string) => Schedule[]
  getAvailableCategories: () => string[]
  isRealTimeEnabled: boolean
  toggleRealTime: () => void
  lastUpdated: Date | null
  setBranch: (branch: string) => void
  currentBranch: string | null
}

export function useSchedules(): UseSchedulesReturn {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [currentBranch, setCurrentBranch] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSchedules = useCallback(async (branch?: string, isInitialLoad = false) => {
    const targetBranch = branch || currentBranch
    
    if (!targetBranch) {
      setSchedules([])
      setError(null)
      setLoading(false)
      return
    }

    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)
      
      const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
      if (!url) {
        throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL is not configured')
      }

      const response = await fetch(`${url}?fn=schedules&branch=${encodeURIComponent(targetBranch.toLowerCase())}`, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        throw new Error('Invalid response format from server')
      }
      
      // Safely check response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response data received')
      }
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch schedules')
      }

      // Safely process schedules data with fallbacks
      try {
        const rawItems = data.items || []
        if (!Array.isArray(rawItems)) {
          console.warn('Schedules data is not an array, using empty array')
          setSchedules([])
          setLastUpdated(new Date())
          return
        }

        // Ensure activity_id is always a string and validate required fields
        const normalizedSchedules = rawItems
          .filter((schedule: unknown) => {
            // Filter out invalid schedule objects
            const s = schedule as Record<string, unknown>
            return s && 
                   typeof s === 'object' && 
                   s.activity_id && 
                   s.activity_name
          })
          .map((schedule: unknown) => {
            const s = schedule as Record<string, unknown>
            return {
              activity_id: String(s.activity_id || ''),
              branch: String(s.branch || ''),
              class_category: String(s.class_category || ''),
              activity_name: String(s.activity_name || ''),
              total_slot: Number(s.total_slot) || 0,
              booked_slot: Number(s.booked_slot) || 0,
              available_slot: Number(s.available_slot) || 0
            }
          })

        setSchedules(normalizedSchedules)
        setLastUpdated(new Date())
      } catch (processingError) {
        console.warn('Error processing schedules data:', processingError)
        // Set empty schedules instead of throwing to prevent app crash
        setSchedules([])
        setLastUpdated(new Date())
        throw new Error('Received invalid schedules data format')
      }
    } catch (err) {
      console.error('Schedules fetch failed:', err)
      
      // Enhanced error handling with specific user-friendly messages
      let userMessage = 'Failed to load activity schedules'
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to server. Please check your internet connection and try again.'
      } else if (err instanceof Error) {
        if (err.message.includes('HTTP 404')) {
          userMessage = 'Schedule data is temporarily unavailable. Please try again later.'
        } else if (err.message.includes('HTTP 500')) {
          userMessage = 'Server error occurred while loading schedules. Please contact support if this persists.'
        } else if (err.message.includes('NEXT_PUBLIC_APPS_SCRIPT_URL is not configured')) {
          userMessage = 'Service configuration error. Please contact support.'
        } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
          userMessage = 'Request timed out while loading schedules. Please try again.'
        } else {
          userMessage = err.message
        }
      }
      
      setError(userMessage)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [currentBranch])

  // Initial fetch when branch is set
  useEffect(() => {
    if (currentBranch) {
      fetchSchedules(currentBranch, true)
    }
  }, [currentBranch, fetchSchedules])

  // Real-time polling
  useEffect(() => {
    if (isRealTimeEnabled && currentBranch) {
      intervalRef.current = setInterval(() => {
        fetchSchedules(currentBranch, false)
      }, 15000) // Poll every 15 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRealTimeEnabled, currentBranch, fetchSchedules])

  const toggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(prev => !prev)
  }, [])

  const manualRefetch = useCallback((branch?: string) => {
    fetchSchedules(branch, true)
  }, [fetchSchedules])

  const setBranch = useCallback((branch: string) => {
    setCurrentBranch(branch)
    setSchedules([]) // Clear schedules when changing branch
    setError(null)
  }, [])

  const getSchedulesByCategory = useCallback((category: string): Schedule[] => {
    return schedules.filter(
      schedule => 
        schedule.class_category === category && 
        schedule.available_slot >= 1
    )
  }, [schedules])

  const getAvailableCategories = useCallback((): string[] => {
    const categories = new Set(
      schedules
        .filter(schedule => schedule.available_slot >= 1)
        .map(schedule => schedule.class_category)
    )
    return Array.from(categories).sort()
  }, [schedules])

  return {
    schedules,
    loading,
    error,
    refetch: manualRefetch,
    getSchedulesByCategory,
    getAvailableCategories,
    isRealTimeEnabled,
    toggleRealTime,
    lastUpdated,
    setBranch,
    currentBranch,
  }
}