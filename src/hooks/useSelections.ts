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
  selections: Selection[]
  addSelection: (selection: Selection) => boolean
  removeSelection: (index: number) => void
  updateSelection: (index: number, selection: Selection) => boolean
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
  const [selections, setSelections] = useState<Selection[]>([])

  const addSelection = useCallback((selection: Selection): boolean => {
    if (selections.length >= MAX_TOTAL_TOKENS) {
      return false
    }

    const categoryCount = selections.filter(
      s => s.class_category === selection.class_category
    ).length

    if (categoryCount >= MAX_TOKENS_PER_CATEGORY) {
      return false
    }

    setSelections(prev => [...prev, selection])
    return true
  }, [selections])

  const removeSelection = useCallback((index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateSelection = useCallback((index: number, selection: Selection): boolean => {
    const currentSelection = selections[index]
    if (!currentSelection) return false

    // If category is the same, just update
    if (currentSelection.class_category === selection.class_category) {
      setSelections(prev => prev.map((s, i) => i === index ? selection : s))
      return true
    }

    // If category is different, check if new category has space
    const otherSelections = selections.filter((_, i) => i !== index)
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
    setSelections([])
  }, [])

  const getCategoryCount = useCallback((category: string): number => {
    return selections.filter(s => s.class_category === category).length
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
      const current = categoryMap.get(selection.class_category) || 0
      categoryMap.set(selection.class_category, current + 1)
    })

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
      maxReached: count >= MAX_TOKENS_PER_CATEGORY,
    }))
  }, [selections])

  const getProgressText = useCallback((): string => {
    const totalText = `${selections.length}/${MAX_TOTAL_TOKENS} tokens`
    const categoryCounts = getCategoryCounts()
    
    if (categoryCounts.length === 0) {
      return totalText
    }

    const categoryTexts = categoryCounts.map(
      ({ category, count }) => `${category} ${count}/${MAX_TOKENS_PER_CATEGORY}`
    )

    return `${totalText} • ${categoryTexts.join(' • ')}`
  }, [selections, getCategoryCounts])

  const canAddMore = useCallback((): boolean => {
    return selections.length < MAX_TOTAL_TOKENS
  }, [selections])

  const isValid = useCallback((): boolean => {
    if (selections.length === 0) return false
    if (selections.length > MAX_TOTAL_TOKENS) return false

    const categoryMap = new Map<string, number>()
    for (const selection of selections) {
      const current = categoryMap.get(selection.class_category) || 0
      const newCount = current + 1
      if (newCount > MAX_TOKENS_PER_CATEGORY) return false
      categoryMap.set(selection.class_category, newCount)
    }

    return true
  }, [selections])

  return {
    selections,
    addSelection,
    removeSelection,
    updateSelection,
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