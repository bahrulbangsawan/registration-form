'use client'

import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'
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
  // Track which token positions have selections (sparse array)
  const [tokenSelections, setTokenSelections] = useState<(Selection | null)[]>(Array(5).fill(null))
  
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
    getCategoryCounts,
    getProgressText,
    canAddMore,
    isValid
  } = useSelections()

  // Get compact selections array (filter out nulls)
  const selections = tokenSelections.filter((selection): selection is Selection => selection !== null)

  const handleMemberSelect = (member: Member, branch: string) => {
    setSelectedMember(member)
    setSelectedBranch(branch)
    if (currentBranch !== branch) {
      setBranch(branch)
    }
    setTokenSelections(Array(5).fill(null)) // Clear any existing selections when changing member
  }

  const handleMemberClear = () => {
    setSelectedMember(null)
    setSelectedBranch(null)
    setTokenSelections(Array(5).fill(null))
  }

  const handleTokenSelectionChange = (tokenIndex: number, selection: Selection | null) => {
    setTokenSelections(prev => {
      const newSelections = [...prev]
      newSelections[tokenIndex] = selection
      return newSelections
    })
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
    const current = categoryCountsMap.get(selection.class_category) || 0
    categoryCountsMap.set(selection.class_category, current + 1)
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
  
  const progressText = `${selections.length}/5 tokens`
  
  // Validation function
  const isValidSelections = () => {
    if (selections.length === 0) return false
    if (selections.length > 5) return false
    
    // Check each selection has required fields
    for (const selection of selections) {
      if (!selection.class_category || !selection.activity_id || !selection.activity_name) {
        return false
      }
    }
    
    // Check category limits
    const categoryCount = new Map<string, number>()
    for (const selection of selections) {
      const current = categoryCount.get(selection.class_category) || 0
      const newCount = current + 1
      if (newCount > 2) return false
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
              />
            </>
          )}

          {/* Step 3: Progress Banner */}
          {selectedMember && !selectedMember.registration_status && (
            <>
              <Separator />
              <ProgressBanner
                totalTokens={selections.length}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleRealTime}
                      className="flex items-center gap-2"
                    >
                      {isRealTimeEnabled ? (
                        <>
                          <WifiOff className="h-4 w-4" />
                          Disable Live
                        </>
                      ) : (
                        <>
                          <Wifi className="h-4 w-4" />
                          Enable Live
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchSchedules(selectedBranch || undefined)}
                      disabled={schedulesLoading || !selectedBranch}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${schedulesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
                
                {schedulesError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    Error loading schedules: {schedulesError}
                  </div>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 5 }, (_, index) => {
                    const tokenNumber = index + 1
                    const selection = tokenSelections[index] || undefined // Convert null to undefined
                    const canAddMore = selections.length < 5
                    const isDisabled = schedulesLoading || !!schedulesError || (!canAddMore && !selection)
                    
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
                selections={selections}
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
