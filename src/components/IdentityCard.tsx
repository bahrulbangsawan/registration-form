'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Calendar, Phone, MapPin, X, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { type Member } from '@/hooks'

interface IdentityCardProps {
  member: Member
  onClear?: () => void
  showClearButton?: boolean
  onMemberUpdate?: (updatedMember: Member) => void
}

export function IdentityCard({ member, onClear, showClearButton = true, onMemberUpdate }: IdentityCardProps) {
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatPhone = (phone: string) => {
    // Simple phone formatting for Indonesian numbers
    if (phone.startsWith('62')) {
      return `+${phone}`
    }
    if (phone.startsWith('0')) {
      return `+62${phone.slice(1)}`
    }
    return phone
  }

  const checkRegistrationStatus = async () => {
    if (!member || !onMemberUpdate) return
    
    setIsCheckingStatus(true)
    setStatusMessage(null)
    setStatusType(null)
    
    try {
      const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
      if (!url) {
        throw new Error('Backend URL not configured')
      }
      
      const searchUrl = `${url}?fn=search&branch=${encodeURIComponent(member.branch)}&member_id=${encodeURIComponent(member.member_id)}`
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'follow',
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
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
        throw new Error(data.error || 'Failed to fetch registration data')
      }
      
      // Handle both response formats: results array or single member object
      let updatedMember: Member | undefined
      
      try {
        if (data.results && Array.isArray(data.results)) {
          // New format: results array
          updatedMember = data.results.find((result: Member) => 
            result && result.member_id === member.member_id
          )
        } else if (data.member && typeof data.member === 'object') {
          // Old format: single member object
          updatedMember = data.member
        }
      } catch (processingError) {
        console.warn('Error processing member data:', processingError)
        setStatusMessage('Received invalid member data format')
        setStatusType('error')
        return
      }
      
      if (updatedMember && typeof updatedMember === 'object') {
        try {
          onMemberUpdate(updatedMember as Member)
          
          // Provide user feedback - safely check for existing_registrations
          const registrations = updatedMember.existing_registrations
          if (registrations && Array.isArray(registrations) && registrations.length > 0) {
            setStatusMessage(`Found ${registrations.length} existing registration(s)`)
            setStatusType('success')
          } else {
            setStatusMessage('No existing registrations found')
            setStatusType('info')
          }
        } catch (updateError) {
          console.warn('Error updating member data:', updateError)
          setStatusMessage('Failed to update member information')
          setStatusType('error')
        }
      } else {
        setStatusMessage('Member data not found in search results')
        setStatusType('error')
      }
      
    } catch (error) {
      console.error('Registration status check failed:', error)
      
      // Enhanced error handling with specific user-friendly messages
      let userMessage = 'Failed to check registration status'
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to registration server. Please check your internet connection and try again.'
      } else if (error instanceof Error) {
        if (error.message.includes('HTTP 404')) {
          userMessage = 'Registration data service is temporarily unavailable. Please try again later.'
        } else if (error.message.includes('HTTP 500')) {
          userMessage = 'Server error occurred. Please contact support if this persists.'
        } else if (error.message.includes('Backend URL not configured')) {
          userMessage = 'Service configuration error. Please contact support.'
        } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          userMessage = 'Request timed out. Please try again.'
        } else {
          userMessage = error.message
        }
      }
      
      setStatusMessage(userMessage)
      setStatusType('error')
    } finally {
      setIsCheckingStatus(false)
      
      // Clear status message after 5 seconds
      setTimeout(() => {
        setStatusMessage(null)
        setStatusType(null)
      }, 5000)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Member Identity</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onMemberUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={checkRegistrationStatus}
                disabled={isCheckingStatus}
                className="h-8 px-3"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                {isCheckingStatus ? 'Checking...' : 'Check Status'}
              </Button>
            )}
            {showClearButton && onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Confirm this is the correct member before proceeding
        </CardDescription>
        {statusMessage && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            statusType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            statusType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {statusType === 'success' && <CheckCircle className="h-4 w-4" />}
            {statusType === 'error' && <AlertCircle className="h-4 w-4" />}
            {statusType === 'info' && <AlertCircle className="h-4 w-4" />}
            {statusMessage}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Member ID Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {member.member_id}
            </Badge>
            <Badge variant="outline">
              {member.branch.toUpperCase()}
            </Badge>
          </div>

          {/* Member Details Table */}
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium w-32">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Name
                  </div>
                </TableCell>
                <TableCell>{member.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Birth Date
                  </div>
                </TableCell>
                <TableCell>{formatDate(member.birthdate)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Parent/Guardian
                  </div>
                </TableCell>
                <TableCell>{member.parent_name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Contact
                  </div>
                </TableCell>
                <TableCell>
                  <a 
                    href={`tel:${formatPhone(member.contact)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {formatPhone(member.contact)}
                  </a>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Branch
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {member.branch.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
              {member.registration_status && (
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {member.registration_status === 'submitted' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {member.registration_status === 'registered' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                      {member.registration_status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                      Status
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={member.registration_status === 'submitted' ? 'default' : 
                              member.registration_status === 'registered' ? 'secondary' : 'outline'}
                      className={member.registration_status === 'submitted' ? 'bg-green-100 text-green-800' :
                                member.registration_status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'}
                    >
                      {member.registration_status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Existing Registrations Section */}
          {member.existing_registrations && member.existing_registrations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Previously Submitted Registrations
              </h4>
              <div className="space-y-2">
                {member.existing_registrations.map((registration, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{registration.activity_name}</div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Token #{registration.token}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}