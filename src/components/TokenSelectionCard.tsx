'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Users, Clock } from 'lucide-react'
import { type Schedule, type Selection, type CategoryCount } from '@/hooks'

interface TokenSelectionCardProps {
  tokenNumber: number
  selection?: Selection
  availableCategories: string[]
  allAvailableCategories: string[]
  categoryCounts: CategoryCount[]
  getSchedulesByCategory: (category: string) => Schedule[]
  onSelectionChange: (selection: Selection | null) => void
  disabled?: boolean
  selectedActivityIds?: string[] // Array of already selected activity IDs from other tokens
}

export function TokenSelectionCard({
  tokenNumber,
  selection,
  availableCategories,
  allAvailableCategories,
  categoryCounts,
  getSchedulesByCategory,
  onSelectionChange,
  disabled = false,
  selectedActivityIds = []
}: TokenSelectionCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(selection?.class_category || '')
  const [selectedSession, setSelectedSession] = useState<string>(selection?.activity_id || '')

  // Sync local state with selection prop when it changes
  useEffect(() => {
    if (selection) {
      setSelectedCategory(selection.class_category)
      setSelectedSession(selection.activity_id)
    } else {
      setSelectedCategory('')
      setSelectedSession('')
    }
  }, [selection])

  const availableSessions = selectedCategory ? getSchedulesByCategory(selectedCategory) : []

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedSession('')
    
    // Clear selection when category changes
    onSelectionChange(null)
  }

  const handleSessionChange = (activityId: string) => {
    setSelectedSession(activityId)
    
    const session = availableSessions.find(s => s.activity_id === activityId)
    if (session && selectedCategory) {
      onSelectionChange({
        class_category: selectedCategory,
        activity_id: String(activityId), // Ensure activity_id is always a string
        activity_name: session.activity_name
      })
    }
  }

  const handleClear = () => {
    setSelectedCategory('')
    setSelectedSession('')
    onSelectionChange(null)
  }

  // Use selection prop for completion check to ensure consistency
  const isComplete = !!selection && !!selection.class_category && !!selection.activity_id
  const hasNoCategories = allAvailableCategories.length === 0
  const hasNoSessions = selectedCategory && availableSessions.length === 0
  
  // Helper function to get category count info
  const getCategoryInfo = (category: string) => {
    const categoryCount = categoryCounts.find(c => c.category === category)
    return categoryCount || { category, count: 0, maxReached: false }
  }
  
  // Check if session is selected and only one category slot remains
  const hasSessionSelected = !!selection?.activity_id
  const currentCategoryInfo = selection?.class_category ? getCategoryInfo(selection.class_category) : null
  const onlyOneCategorySlotRemains = !!(currentCategoryInfo && currentCategoryInfo.count === 1 && !currentCategoryInfo.maxReached)
  const shouldDisableBothSelections = hasSessionSelected && onlyOneCategorySlotRemains

  return (
    <Card className={`w-full min-w-0 ${isComplete ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap">Token {tokenNumber}</span>
              {isComplete && (
                <Badge variant="default" className="bg-green-600 flex-shrink-0">
                  Selected
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              Choose a category and session for this token
            </CardDescription>
          </div>
          {isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Class Category</label>
          {hasNoCategories ? (
            <Alert>
              <AlertDescription>
                All available categories have reached their maximum limit (2 tokens per category).
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={selectedCategory}
              onValueChange={handleCategoryChange}
              disabled={disabled || hasNoCategories || availableCategories.length === 0 || shouldDisableBothSelections}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {allAvailableCategories.map((category) => {
                  const categorySchedules = getSchedulesByCategory(category)
                  const availableCount = categorySchedules.length
                  const categoryInfo = getCategoryInfo(category)
                  const isMaxed = categoryInfo.maxReached
                  
                  // Check if all sessions in this category are already selected by other tokens
                  const allSessionsSelected = categorySchedules.every(session => 
                    selectedActivityIds.includes(session.activity_id)
                  )
                  const isCurrentSelection = selection && selection.class_category === category
                  
                  const canSelect = (!isMaxed && !allSessionsSelected) || isCurrentSelection
                  
                  return (
                    <SelectItem key={category} value={category} disabled={!canSelect}>
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className={`truncate ${!canSelect ? 'text-gray-400' : ''}`}>{category}</span>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {isMaxed ? (
                            <Badge variant="destructive" className="text-xs">
                              2/2 Tokens used
                            </Badge>
                          ) : allSessionsSelected && !isCurrentSelection ? (
                            <Badge variant="destructive" className="text-xs">
                              Already Selected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {availableCount} available
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Session Selection */}
        {selectedCategory && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Session</label>
            {hasNoSessions ? (
              <Alert>
                <AlertDescription>
                  No available sessions for {selectedCategory}. All sessions are fully booked.
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedSession}
                onValueChange={handleSessionChange}
                disabled={disabled || hasNoSessions || !selectedCategory || availableSessions.length === 0 || shouldDisableBothSelections}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {availableSessions.map((session) => {
                    const isAlreadySelected = selectedActivityIds.includes(session.activity_id)
                    const isCurrentSelection = selection?.activity_id === session.activity_id
                    const canSelect = !isAlreadySelected || isCurrentSelection
                    
                    return (
                      <SelectItem 
                        key={session.activity_id} 
                        value={session.activity_id} 
                        className="py-4"
                        disabled={!canSelect}
                      >
                        <div className="space-y-2">
                          <div className={`font-medium flex items-center gap-2 ${
                            !canSelect ? 'text-gray-400' : ''
                          }`}>
                            {session.activity_name}
                            {isAlreadySelected && !isCurrentSelection && (
                              <Badge variant="destructive" className="text-xs">
                                Already Selected
                              </Badge>
                            )}
                          </div>
                          <div className={`flex items-center gap-6 text-xs ${
                            !canSelect ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{session.available_slot} slots left</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{session.total_slot} total</span>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Selection Summary */}
        {isComplete && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-800">
              Selected: {selection?.activity_name}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Category: {selection?.class_category}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}