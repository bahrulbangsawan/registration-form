'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { Search, User, Phone, MapPin } from 'lucide-react'
import { useMemberSearch, type Member } from '@/hooks'

interface PhoneSearchCardProps {
  onMemberSelect: (member: Member, branch: string) => void
  disabled?: boolean
}

export function PhoneSearchCard({ onMemberSelect, disabled = false }: PhoneSearchCardProps) {
  const [selectedBranch, setSelectedBranch] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const { results, loading, error, search, clearResults } = useMemberSearch()

  const formatPhoneDisplay = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format for display (Indonesian phone number format)
    if (digits.length <= 4) return digits
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
    if (digits.length <= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`
  }

  const handlePhoneChange = (value: string) => {
    // Only allow digits, spaces, dashes, and plus
    const cleanValue = value.replace(/[^0-9\s\-+]/g, '')
    setPhoneNumber(cleanValue)
    
    if (selectedBranch && cleanValue.trim()) {
      search(selectedBranch, cleanValue)
    } else {
      clearResults()
    }
  }

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch)
    // Clear results and abort any in-flight requests when branch changes
    clearResults()
    if (branch && phoneNumber.trim()) {
      search(branch, phoneNumber) // debounced search for branch change
    }
  }

  const handleSearch = () => {
    if (selectedBranch && phoneNumber.trim()) {
      search(selectedBranch, phoneNumber, true) // immediate=true for explicit search button
    }
  }

  const handleMemberSelect = (member: Member) => {
    onMemberSelect(member, selectedBranch)
    setPhoneNumber('')
    setSelectedBranch('')
    clearResults()
  }

  const canSearch = selectedBranch && phoneNumber.trim().length >= 8

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Search
        </CardTitle>
        <CardDescription>
          Select your branch and enter your phone number to start the registration process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Branch Selection */}
         <div className="space-y-3">
           <div className="text-sm font-medium flex items-center gap-2">
             <MapPin className="h-4 w-4" />
             Select Branch
           </div>
           <div className="flex gap-3">
             <Button
               variant={selectedBranch === 'bsd' ? 'default' : 'outline'}
               onClick={() => handleBranchChange('bsd')}
               disabled={disabled}
               className="flex-1"
             >
               BSD
             </Button>
             <Button
               variant={selectedBranch === 'kuningan' ? 'default' : 'outline'}
               onClick={() => handleBranchChange('kuningan')}
               disabled={disabled}
               className="flex-1"
             >
               Kuningan
             </Button>
           </div>
         </div>

        {/* Phone Number Input */}
         <div className="space-y-2">
           <div className="text-sm font-medium flex items-center gap-2">
             <Phone className="h-4 w-4" />
             Phone Number
           </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="tel"
                placeholder={disabled ? "Preparing search..." : "Enter phone number (e.g., 6282129505610)"}
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={disabled || !selectedBranch}
                className="pr-10 h-12 text-base"
                inputMode="numeric"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                </div>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!canSearch || loading || disabled}
              size="default"
              className="h-12"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {phoneNumber && (
            <p className="text-xs text-gray-500">
              Formatted: {formatPhoneDisplay(phoneNumber)}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button
                  onClick={handleSearch}
                  disabled={!canSearch || loading || disabled}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Retry Search
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading && canSearch && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {!loading && canSearch && results.length === 0 && !error && (
          <Alert variant="destructive">
            <AlertDescription>
              No members found with phone number &quot;{formatPhoneDisplay(phoneNumber)}&quot; in {selectedBranch.toUpperCase()} branch. Please check the number or try a different branch.
              <div className="mt-2">
                <Button
                  onClick={handleSearch}
                  disabled={!canSearch || loading || disabled}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Try Search Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!loading && results.length > 0 && (
          <Command className="border rounded-lg">
            <CommandList className="max-h-64">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading={`Found ${results.length} member${results.length === 1 ? '' : 's'}`}>
                {results.map((member) => (
                  <CommandItem
                    key={member.member_id}
                    onSelect={() => handleMemberSelect(member)}
                    className="flex items-center justify-between p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">
                          {member.branch} • {member.member_id}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Choose
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}

        {!selectedBranch && (
          <div className="text-center text-gray-500 py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Please select a branch to continue</p>
          </div>
        )}

        {selectedBranch && !phoneNumber && (
          <div className="text-center text-gray-500 py-8">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Enter your phone number to search for your profile</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}