'use client'

import { useState, useCallback, useMemo } from 'react'

export interface Selection {
  class_category: string
  activity_id: string
  activity_name: string
}

export interface CategoryCount {
  category: string
  count: number
  maxReached: boolean
}

export interface UseSelectionsReturn {
  selections: (Selection | null)[]
  addSelection: (selection: Selection) => boolean
  removeSelection: (index: number) => void
  updateSelection: (index: number, selection: Selection) => boolean
  setSelectionAtPosition: (index: number, selection: Selection) => boolean
  clearSelections: () => void
  getCategoryCount: (category: string) => number
  isCategoryMaxed: (category: string) => boolean
  getAvailableCategories: (allCategories: string[]) => string[]
  getCategoryCounts: () => CategoryCount[]
  getProgressText: () => string
  canAddMore: () => boolean
  isValid: () => boolean
}

const MAX_TOTAL_TOKENS = 5
const MAX_TOKENS_PER_CATEGORY = 2

export function useSelections(): UseSelectionsReturn {
  const [selections, setSelections] = useState<(Selection | null)[]>(Array(MAX_TOTAL_TOKENS).fill(null))

  const addSelection = useCallback((selection: Selection): boolean => {
    const validSelections = selections.filter(s => s !== null) as Selection[]
    
    if (validSelections.length >= MAX_TOTAL_TOKENS) {
      return false
    }

    const categoryCount = validSelections.filter(
      s => s.class_category === selection.class_category
    ).length

    if (categoryCount >= MAX_TOKENS_PER_CATEGORY) {
      return false
    }

    // Check for duplicate session (same activity_id)
    const isDuplicate = validSelections.some(
      s => s.activity_id === selection.activity_id
    )

    if (isDuplicate) {
      return false
    }

    // Find first available slot
    const firstEmptyIndex = selections.findIndex(s => s === null)
    if (firstEmptyIndex === -1) {
      return false
    }

    setSelections(prev => {
      const newSelections = [...prev]
      newSelections[firstEmptyIndex] = selection
      return newSelections
    })
    return true
  }, [selections])

  const removeSelection = useCallback((index: number) => {
    setSelections(prev => {
      const newSelections = [...prev]
      newSelections[index] = null
      return newSelections
    })
  }, [])

  const updateSelection = useCallback((index: number, selection: Selection): boolean => {
    const currentSelection = selections[index]
    if (!currentSelection) return false

    // Check for duplicate session (same activity_id) excluding current selection
    const otherSelections = selections.filter((s, i) => i !== index && s !== null) as Selection[]
    const isDuplicate = otherSelections.some(
      s => s.activity_id === selection.activity_id
    )

    if (isDuplicate) {
      return false
    }

    // If category is the same, just update
    if (currentSelection.class_category === selection.class_category) {
      setSelections(prev => prev.map((s, i) => i === index ? selection : s))
      return true
    }

    // If category is different, check if new category has space
    const newCategoryCount = otherSelections.filter(
      s => s.class_category === selection.class_category
    ).length

    if (newCategoryCount >= MAX_TOKENS_PER_CATEGORY) {
      return false
    }

    setSelections(prev => prev.map((s, i) => i === index ? selection : s))
    return true
  }, [selections])

  const clearSelections = useCallback(() => {
    setSelections(Array(MAX_TOTAL_TOKENS).fill(null))
  }, [])

  const getCategoryCount = useCallback((category: string): number => {
    return selections.filter(s => s !== null && s.class_category === category).length
  }, [selections])

  const isCategoryMaxed = useCallback((category: string): boolean => {
    return getCategoryCount(category) >= MAX_TOKENS_PER_CATEGORY
  }, [getCategoryCount])

  const getAvailableCategories = useCallback((allCategories: string[]): string[] => {
    return allCategories.filter(category => !isCategoryMaxed(category))
  }, [isCategoryMaxed])

  const getCategoryCounts = useCallback((): CategoryCount[] => {
    const categoryMap = new Map<string, number>()
    
    selections.forEach(selection => {
      if (selection !== null) {
        const current = categoryMap.get(selection.class_category) || 0
        categoryMap.set(selection.class_category, current + 1)
      }
    })

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
      maxReached: count >= MAX_TOKENS_PER_CATEGORY,
    }))
  }, [selections])

  const getProgressText = useCallback((): string => {
    const validSelections = selections.filter(s => s !== null)
    return `${validSelections.length}/${MAX_TOTAL_TOKENS} tokens`
  }, [selections])

  const canAddMore = useCallback((): boolean => {
    const validSelections = selections.filter(s => s !== null)
    return validSelections.length < MAX_TOTAL_TOKENS
  }, [selections])

  const isValid = useCallback((): boolean => {
    const validSelections = selections.filter(s => s !== null) as Selection[]
    if (validSelections.length === 0) return false
    if (validSelections.length > MAX_TOTAL_TOKENS) return false

    const categoryMap = new Map<string, number>()
    for (const selection of validSelections) {
      const current = categoryMap.get(selection.class_category) || 0
      const newCount = current + 1
      if (newCount > MAX_TOKENS_PER_CATEGORY) return false
      categoryMap.set(selection.class_category, newCount)
    }

    return true
  }, [selections])

  const setSelectionAtPosition = useCallback((index: number, selection: Selection): boolean => {
    if (index < 0 || index >= MAX_TOTAL_TOKENS) {
      return false
    }

    const validSelections = selections.filter((s, i) => s !== null && i !== index) as Selection[]
    
    // Check total limit
    if (validSelections.length >= MAX_TOTAL_TOKENS) {
      return false
    }

    // Check category limit
    const categoryCount = validSelections.filter(
      s => s.class_category === selection.class_category
    ).length

    if (categoryCount >= MAX_TOKENS_PER_CATEGORY) {
      return false
    }

    // Check for duplicate session
    const isDuplicate = validSelections.some(
      s => s.activity_id === selection.activity_id
    )

    if (isDuplicate) {
      return false
    }

    setSelections(prev => {
      const newSelections = [...prev]
      newSelections[index] = selection
      return newSelections
    })
    return true
  }, [selections])

  return {
    selections,
    addSelection,
    removeSelection,
    updateSelection,
    setSelectionAtPosition,
    clearSelections,
    getCategoryCount,
    isCategoryMaxed,
    getAvailableCategories,
    getCategoryCounts,
    getProgressText,
    canAddMore,
    isValid,
  }
}