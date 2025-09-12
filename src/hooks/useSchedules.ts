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

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch schedules')
      }

      setSchedules(data.items || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules')
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