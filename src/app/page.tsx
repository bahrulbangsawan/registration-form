'use client'

import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react'
import { 
  PhoneSearchCard, 
  IdentityCard, 
  ProgressBanner, 
  TokenSelectionCard, 
  SubmitCard,
  WhatsAppButton 
} from '@/components'

import { 
  useSchedules, 
  useSelections, 
  type Member, 
  type Selection 
} from '@/hooks'


export default function RegistrationPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  

  
  const { 
    schedules, 
    loading: schedulesLoading, 
    error: schedulesError, 
    refetch: refetchSchedules, 
    getSchedulesByCategory, 
    getAvailableCategories,
    isRealTimeEnabled,
    toggleRealTime,
    lastUpdated,
    setBranch,
    currentBranch
  } = useSchedules()
  
  const { 
    selections,
    addSelection,
    updateSelection,
    removeSelection,
    setSelectionAtPosition,
    clearSelections,
    getCategoryCounts,
    getProgressText,
    canAddMore,
    isValid
  } = useSelections()

  // selections is now already a sparse array that maintains token positions
  const tokenSelections = selections

  const handleMemberSelect = (member: Member, branch: string) => {
    setSelectedMember(member)
    setSelectedBranch(branch)
    if (currentBranch !== branch) {
      setBranch(branch)
    }
    clearSelections() // Clear any existing selections when changing member
  }

  const handleMemberClear = () => {
    setSelectedMember(null)
    setSelectedBranch(null)
    clearSelections()
  }

  const handleMemberUpdate = (updatedMember: Member) => {
    setSelectedMember(updatedMember)
  }

  const handleTokenSelectionChange = (tokenIndex: number, selection: Selection | null) => {
    const currentSelection = selections[tokenIndex]
    
    if (selection === null) {
      // Remove selection
      if (currentSelection) {
        removeSelection(tokenIndex)
      }
      return
    }
    
    if (currentSelection) {
      // Update existing selection
      const success = updateSelection(tokenIndex, selection)
      if (!success) {
        // Show user feedback that the selection was rejected due to duplicate
        console.warn('Cannot select the same session for multiple tokens')
      }
    } else {
      // Add new selection at specific token position
      const success = setSelectionAtPosition(tokenIndex, selection)
      if (!success) {
        console.warn('Cannot add selection - limits reached or duplicate')
      }
    }
  }

  const handleSubmitSuccess = () => {
    // Optionally clear form after successful submission
    // setSelectedMember(null)
    // setTokenSelections(Array(5).fill(null))
  }

  // Get available categories considering current selections
  const allAvailableCategories = getAvailableCategories()
  
  // Calculate category counts from current selections
  const categoryCountsMap = new Map<string, number>()
  selections.forEach(selection => {
    if (selection !== null) {
      const current = categoryCountsMap.get(selection.class_category) || 0
      categoryCountsMap.set(selection.class_category, current + 1)
    }
  })
  
  const availableCategoriesForNewSelections = allAvailableCategories.filter(category => {
    const count = categoryCountsMap.get(category) || 0
    return count < 2 // MAX_TOKENS_PER_CATEGORY
  })

  const categoryCounts = Array.from(categoryCountsMap.entries()).map(([category, count]) => ({
    category,
    count,
    maxReached: count >= 2
  }))
  
  const progressText = getProgressText()
  
  // Enhanced validation function
  const isValidSelections = () => {
    const validSelections = selections.filter(s => s !== null)
    if (validSelections.length === 0) return false
    if (validSelections.length > 5) return false
    
    // Check each valid selection has required fields with proper validation
    for (let i = 0; i < validSelections.length; i++) {
      const selection = validSelections[i]
      
      // Validate selection object exists (should always be true after filtering)
      if (!selection || typeof selection !== 'object') {
        console.error(`Selection ${i + 1} is invalid or missing`)
        return false
      }
      
      // Validate required fields with type checking and trimming
      const requiredFields = ['class_category', 'activity_id', 'activity_name'] as const
      for (const field of requiredFields) {
        const value = selection[field]
        
        // Special handling for activity_id which might be a number from backend
        if (field === 'activity_id') {
          if (!value || (typeof value !== 'string' && typeof value !== 'number')) {
            console.error(`Selection ${i + 1} ${field} is required and must be a non-empty string or number. Current value:`, value)
            return false
          }
          // Convert number to string and validate
          const stringValue = String(value).trim()
          if (stringValue.length === 0) {
            console.error(`Selection ${i + 1} ${field} cannot be empty after conversion. Current value:`, value)
            return false
          }
        } else {
          // Standard string validation for other fields
          if (!value || typeof value !== 'string' || value.trim().length === 0) {
            console.error(`Selection ${i + 1} ${field} is required and must be a non-empty string. Current value:`, value)
            return false
          }
        }
      }
    }
    
    // Check category limits
    const categoryCount = new Map<string, number>()
    for (const selection of validSelections) {
      const current = categoryCount.get(selection.class_category) || 0
      const newCount = current + 1
      if (newCount > 2) {
        console.error(`Category limit exceeded for ${selection.class_category}: ${newCount}/2`)
        return false
      }
      categoryCount.set(selection.class_category, newCount)
    }
    
    return true
  }

  return (
    <div className="min-h-screen bg-gray-50">

      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            KYZN NEW TERM Registration
          </h1>
          <p className="text-gray-600">
            Register for up to 5 activity tokens (maximum 2 per class)
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Name Search */}
          <PhoneSearchCard 
            onMemberSelect={handleMemberSelect}
            disabled={schedulesLoading}
          />

          {/* Step 2: Identity Confirmation */}
          {selectedMember && (
            <>
              <Separator />
              <IdentityCard 
                member={selectedMember}
                onClear={handleMemberClear}
                onMemberUpdate={handleMemberUpdate}
              />
            </>
          )}

          {/* Step 3: Progress Banner */}
          {selectedMember && !selectedMember.registration_status && (
            <>
              <Separator />
              <ProgressBanner
                totalTokens={selections.filter(s => s !== null).length}
                maxTokens={5}
                categoryCounts={categoryCounts}
                progressText={progressText}
              />
            </>
          )}

          {/* Step 4: Token Selections */}
          {selectedMember && !selectedMember.registration_status && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Token Selections
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                       {isRealTimeEnabled ? (
                         <div className="flex items-center gap-1">
                           <Wifi className="h-4 w-4 text-green-500" />
                           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                         </div>
                       ) : (
                         <WifiOff className="h-4 w-4 text-gray-400" />
                       )}
                       <span>{isRealTimeEnabled ? 'Live' : 'Manual'}</span>
                       {lastUpdated && (
                         <>
                           <Clock className="h-3 w-3" />
                           <span className="text-xs">
                             {lastUpdated.toLocaleTimeString()}
                           </span>
                         </>
                       )}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mobile-button-container">
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleRealTime}
                        className="flex items-center gap-2 min-w-0 flex-shrink-0 w-full justify-center"
                      >
                        {isRealTimeEnabled ? (
                          <>
                            <WifiOff className="h-4 w-4" />
                            <span className="hidden sm:inline">Disable Live</span>
                            <span className="sm:hidden">Live</span>
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4" />
                            <span className="hidden sm:inline">Enable Live</span>
                            <span className="sm:hidden">Manual</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => refetchSchedules()}
                        className="flex items-center gap-2 min-w-0 flex-shrink-0 hover:scale-105 active:scale-95 transition-transform w-full justify-center"
                        disabled={schedulesLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${schedulesLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh Class</span>
                      </Button>
                    </div>

                  </div>
                </div>
                
                {schedulesError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    Error loading schedules: {schedulesError}
                  </div>
                )}
                
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 w-full max-w-none overflow-hidden">
                  {Array.from({ length: 5 }, (_, index) => {
                    const tokenNumber = index + 1
                    const selection = tokenSelections[index] || undefined // Convert null to undefined
                    const canAddMore = selections.filter(s => s !== null).length < 5
                    const isDisabled = schedulesLoading || !!schedulesError || (!canAddMore && !selection)
                    
                    // Get activity IDs from other tokens (excluding current token)
                    const selectedActivityIds = tokenSelections
                      .filter((_, i) => i !== index) // Exclude current token
                      .map(sel => sel?.activity_id)
                      .filter(Boolean) as string[]
                    
                    return (
                      <TokenSelectionCard
                        key={tokenNumber}
                        tokenNumber={tokenNumber}
                        selection={selection}
                        availableCategories={availableCategoriesForNewSelections}
                        allAvailableCategories={allAvailableCategories}
                        categoryCounts={categoryCounts}
                        getSchedulesByCategory={getSchedulesByCategory}
                        onSelectionChange={(newSelection) => handleTokenSelectionChange(index, newSelection)}
                        disabled={isDisabled}
                        selectedActivityIds={selectedActivityIds}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Step 5: Submit */}
          {selectedMember && (
            <>
              <Separator />
              <SubmitCard
                member={selectedMember}
                selections={selections.filter(s => s !== null) as Selection[]}
                isValid={isValidSelections()}
                onSubmitSuccess={handleSubmitSuccess}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Need help? Contact support for assistance with registration.</p>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster />
      
      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </div>
  )
}
