'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Send, Loader2, Clock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { type Member, type Selection } from '@/hooks'

interface SubmitCardProps {
  member: Member | null
  selections: Selection[]
  isValid: boolean
  onSubmitSuccess?: () => void
}

interface SubmitPayload {
  member: Member
  selections: Selection[]
  request_id: string
}

interface SubmitResponse {
  ok: boolean
  error?: string
  queued?: boolean
  request_id?: string
  conflicts?: string[]
}

// Generate UUID v4
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Exponential backoff utility
class ExponentialBackoff {
  private delays = [400, 800, 1600, 3200, 6400] // ms
  private attempt = 0

  reset() {
    this.attempt = 0
  }

  async wait(): Promise<boolean> {
    if (this.attempt >= this.delays.length) {
      return false // Max attempts reached
    }
    
    const delay = this.delays[this.attempt]
    this.attempt++
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return true
  }

  getAttempt(): number {
    return this.attempt
  }
}

export function SubmitCard({ member, selections, isValid, onSubmitSuccess }: SubmitCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isQueued, setIsQueued] = useState(false)
  const [queuedRequestId, setQueuedRequestId] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [backoff] = useState(() => new ExponentialBackoff())
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if member has already submitted registration
  const hasExistingRegistration = member?.registration_status && member.registration_status !== ''
  
  const canSubmit = member && 
    selections.length > 0 && 
    isValid && 
    !isSubmitting && 
    !isSubmitted && 
    !hasExistingRegistration

  const submitWithRetry = useCallback(async (requestId: string, signal: AbortSignal): Promise<SubmitResponse> => {
    const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
    if (!url) {
      throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL is not configured')
    }

    const payload: SubmitPayload = {
      member: member!,
      selections,
      request_id: requestId
    }

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('BUSY') // Special error for busy server
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }, [member, selections])

  const handleSubmit = async () => {
    if (!member || !canSubmit) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsSubmitting(true)
    setSubmitError(null)
    setConflicts([])
    setIsQueued(false)
    backoff.reset()

    const requestId = generateRequestId()
    setCurrentRequestId(requestId)

    try {
      let lastError: Error | null = null
      
      // Attempt submission with exponential backoff
      do {
        try {
          const data = await submitWithRetry(requestId, signal)
          
          if (data.ok) {
            if (data.queued) {
              // Submission queued
              setIsQueued(true)
              setQueuedRequestId(data.request_id || requestId)
              toast.info('Submission queued', {
                description: 'Your registration is queued for processing. You\'ll see confirmation shortly.'
              })
              return
            } else {
              // Immediate success
              setIsSubmitted(true)
              toast.success('Registration submitted successfully!', {
                description: `${selections.length} token${selections.length === 1 ? '' : 's'} registered for ${member.name}`
              })
              onSubmitSuccess?.()
              return
            }
          } else {
            // Handle conflicts
            if (data.conflicts && data.conflicts.length > 0) {
              setConflicts(data.conflicts)
              toast.error('Session conflicts detected', {
                description: 'Some sessions are now full. Please reselect conflicting sessions.'
              })
              return
            }
            
            throw new Error(data.error || 'Registration failed')
          }
        } catch (err) {
          lastError = err as Error

          if (err instanceof Error && err.name === 'AbortError') {
            // Request was cancelled, ignore silently
            return
          }
          
          // If it's a busy error, try exponential backoff
          if (lastError.message === 'BUSY') {
            const canRetry = await backoff.wait()
            if (canRetry) {
              toast.info(`Server busy, retrying... (attempt ${backoff.getAttempt()})`, {
                description: 'Please wait while we retry your submission'
              })
              continue // Retry
            }
          }
          
          // For other errors or max retries reached, break
          break
        }
      } while (true)
      
      // If we get here, all retries failed
      throw lastError || new Error('Registration failed after retries')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setSubmitError(errorMessage)
      toast.error('Registration failed', {
        description: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSubmitButtonText = () => {
    if (hasExistingRegistration) return 'You already submitted'
    if (isSubmitting) return 'Submitting...'
    if (isQueued) return 'Queued for Processing'
    if (isSubmitted) return 'Submitted'
    if (conflicts.length > 0) return 'Resolve Conflicts & Resubmit'
    return `Submit Registration (${selections.length} token${selections.length === 1 ? '' : 's'})`
  }

  const getStatusMessage = () => {
    if (!member) {
      return {
        type: 'info' as const,
        message: 'Please select a member to continue'
      }
    }
    
    if (hasExistingRegistration) {
      return {
        type: 'error' as const,
        message: 'This member has already submitted registration and cannot submit again.'
      }
    }
    
    if (conflicts.length > 0) {
      return {
        type: 'warning' as const,
        message: `Session conflicts detected: ${conflicts.join(', ')}. Please reselect these sessions.`
      }
    }
    
    if (isQueued) {
      return {
        type: 'info' as const,
        message: `Registration queued for processing (ID: ${queuedRequestId?.slice(-8)}). Please wait for confirmation.`
      }
    }
    
    if (selections.length === 0) {
      return {
        type: 'info' as const,
        message: 'Please select at least one token to submit'
      }
    }
    
    if (!isValid) {
      return {
        type: 'error' as const,
        message: 'Please check your selections. Some rules may be violated.'
      }
    }
    
    if (isSubmitted) {
      return {
        type: 'success' as const,
        message: 'Registration has been submitted successfully!'
      }
    }
    
    return {
      type: 'ready' as const,
      message: 'Ready to submit registration'
    }
  }

  const status = getStatusMessage()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Submit Registration
        </CardTitle>
        <CardDescription>
          Review your selections and submit your registration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registration Summary */}
        {member && selections.length > 0 && !hasExistingRegistration && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="font-medium">Registration Summary</div>
            <div className="text-sm text-gray-800">
              <div>Member: {member.name} ({member.member_id})</div>
              <div>Tokens: {selections.length}/5</div>
            </div>
            <div className="space-y-1">
              {selections.map((selection, index) => (
                <div key={index} className="text-sm text-gray-700">
                  Token {index + 1}: {selection.activity_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Alert */}
        <Alert 
          variant={status.type === 'error' ? 'destructive' : 'default'}
          className={
            status.type === 'success' ? 'border-green-200 bg-green-50' :
            status.type === 'ready' ? 'border-blue-200 bg-blue-50' :
            status.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            status.type === 'info' && isQueued ? 'border-purple-200 bg-purple-50' : ''
          }
        >
          {status.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
          {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {status.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
          {status.type === 'ready' && <CheckCircle className="h-4 w-4 text-blue-600" />}
          {status.type === 'info' && isQueued && <Clock className="h-4 w-4 text-purple-600" />}
          {status.type === 'info' && !isQueued && <AlertCircle className="h-4 w-4" />}
          <AlertDescription 
            className={
              status.type === 'success' ? 'text-green-800' :
              status.type === 'ready' ? 'text-blue-800' :
              status.type === 'warning' ? 'text-yellow-800' :
              status.type === 'info' && isQueued ? 'text-purple-800' : ''
            }
          >
            {status.message}
          </AlertDescription>
        </Alert>

        {/* Submit Error */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {submitError}
            </AlertDescription>
          </Alert>
        )}

        {/* Conflict Resolution */}
        {conflicts.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="font-medium text-yellow-800 mb-2">Sessions No Longer Available:</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index} className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {conflict}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-sm text-yellow-700">
              Please go back and reselect these sessions with available alternatives.
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit && !conflicts.length}
          className="w-full"
          size="lg"
          variant={conflicts.length > 0 ? 'outline' : 'default'}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isQueued && <Clock className="mr-2 h-4 w-4" />}
          {isSubmitted && <CheckCircle className="mr-2 h-4 w-4" />}
          {conflicts.length > 0 && <RefreshCw className="mr-2 h-4 w-4" />}
          {!isSubmitting && !isSubmitted && !isQueued && conflicts.length === 0 && <Send className="mr-2 h-4 w-4" />}
          {getSubmitButtonText()}
        </Button>

        {/* Reset Options */}
        {(isSubmitted || isQueued) && (
          <Button
            variant="outline"
            onClick={() => {
              setIsSubmitted(false)
              setIsQueued(false)
              setSubmitError(null)
              setConflicts([])
              setQueuedRequestId(null)
              setCurrentRequestId(null)
              backoff.reset()
            }}
            className="w-full"
          >
            Submit Another Registration
          </Button>
        )}
        
        {conflicts.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              setConflicts([])
              setSubmitError(null)
            }}
            className="w-full"
          >
            Clear Conflicts
          </Button>
        )}
      </CardContent>
    </Card>
  )
}