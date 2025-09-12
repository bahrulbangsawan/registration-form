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
}

export function TokenSelectionCard({
  tokenNumber,
  selection,
  availableCategories,
  allAvailableCategories,
  categoryCounts,
  getSchedulesByCategory,
  onSelectionChange,
  disabled = false
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
        activity_id: activityId,
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

  return (
    <Card className={`w-full ${isComplete ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Token {tokenNumber}
              {isComplete && (
                <Badge variant="default" className="bg-green-600">
                  Selected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Choose a category and session for this token
            </CardDescription>
          </div>
          {isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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
              disabled={disabled || hasNoCategories}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {allAvailableCategories.map((category) => {
                  const categorySchedules = getSchedulesByCategory(category)
                  const availableCount = categorySchedules.length
                  const categoryInfo = getCategoryInfo(category)
                  const isMaxed = categoryInfo.maxReached
                  const canSelect = !isMaxed || (selection && selection.class_category === category)
                  
                  return (
                    <SelectItem key={category} value={category} disabled={!canSelect}>
                      <div className="flex items-center justify-between w-full">
                        <span className={!canSelect ? 'text-gray-400' : ''}>{category}</span>
                        <div className="flex items-center gap-2 ml-2">
                          {isMaxed ? (
                            <Badge variant="destructive" className="text-xs">
                              2/2 Tokens used
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
                disabled={disabled || hasNoSessions || !selectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a session..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSessions.map((session) => (
                    <SelectItem key={session.activity_id} value={session.activity_id} className="py-4">
                      <div className="space-y-2">
                        <div className="font-medium">{session.activity_name}</div>
                        <div className="flex items-center gap-6 text-xs text-gray-500">
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
                  ))}
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