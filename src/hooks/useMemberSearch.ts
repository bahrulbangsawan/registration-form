'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ExistingRegistration {
  activity_name: string
  token: number
}

export interface Member {
  member_id: string
  branch: string
  name: string
  birthdate: string
  parent_name: string
  contact: string
  registration_status?: string | null
  existing_registrations?: ExistingRegistration[]
}

export interface UseMemberSearchReturn {
  results: Member[]
  loading: boolean
  error: string | null
  search: (branch: string, phone: string, immediate?: boolean) => void
  clearResults: () => void
}

export function useMemberSearch(): UseMemberSearchReturn {
  const [results, setResults] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const searchMembers = useCallback(async (branch: string, phone: string) => {
    // Normalize phone: remove non-digits
    const normalizedPhone = phone.replace(/\D/g, '')
    
    // Validation: branch required and phone minimum length
    if (!branch.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    
    if (normalizedPhone.length < 9) {
      setResults([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      
      const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
      if (!url) {
        throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL is not configured')
      }
      
      const searchUrlBuilder = new URL(url)
      searchUrlBuilder.searchParams.set('fn', 'search')
      searchUrlBuilder.searchParams.set('branch', branch.toLowerCase())
      searchUrlBuilder.searchParams.set('phone', normalizedPhone)

      const response = await fetch(searchUrlBuilder.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        // Treat non-200 as controlled failures
        const errorText = await response.text()
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to search members')
      }

      // Handle both single member and multiple results
      if (data.results && Array.isArray(data.results)) {
        setResults(data.results)
      } else if (data.member) {
        // Backward compatibility for single member response
        setResults([data.member])
      } else {
        setResults([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore silently
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to search members')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback((branch: string, phone: string, immediate = false) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // If immediate (e.g., explicit search button), run immediately
    if (immediate) {
      searchMembers(branch, phone)
      return
    }

    // Set new debounce (500ms for better UX)
    debounceRef.current = setTimeout(() => {
      searchMembers(branch, phone)
    }, 500)
  }, [searchMembers])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
    setLoading(false)
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Clear debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  }
}