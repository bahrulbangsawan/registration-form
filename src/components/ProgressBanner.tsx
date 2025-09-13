'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import { type CategoryCount } from '@/hooks'

interface ProgressBannerProps {
  totalTokens: number
  maxTokens: number
  categoryCounts: CategoryCount[]
  progressText: string
}

export function ProgressBanner({ 
  totalTokens, 
  maxTokens, 
  categoryCounts, 
  progressText 
}: ProgressBannerProps) {
  const progressPercentage = (totalTokens / maxTokens) * 100
  const isComplete = totalTokens === maxTokens
  const hasSelections = totalTokens > 0

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Token Progress</span>
              <span className="text-gray-600">
                {totalTokens} of {maxTokens} tokens selected
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Progress Text */}
          <div className="text-center w-full px-2">
            <Badge 
              variant={isComplete ? "default" : hasSelections ? "secondary" : "outline"}
              className="text-sm px-3 py-1 max-w-full break-words whitespace-normal text-center leading-relaxed sm:whitespace-nowrap sm:break-normal inline-block"
            >
              {progressText}
            </Badge>
          </div>

          {/* Category Breakdown */}
          {categoryCounts.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Category Breakdown:
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryCounts.map(({ category, count, maxReached }) => (
                  <Badge
                    key={category}
                    variant={maxReached ? "default" : "outline"}
                    className="flex items-center gap-1"
                  >
                    {maxReached && <CheckCircle className="h-3 w-3" />}
                    {category}: {count}/2
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {!hasSelections && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select up to 5 tokens from available activities. Maximum 2 tokens per category.
              </AlertDescription>
            </Alert>
          )}

          {hasSelections && !isComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can select {maxTokens - totalTokens} more token{maxTokens - totalTokens === 1 ? '' : 's'}.
                {categoryCounts.some(c => c.maxReached) && (
                  <span className="block mt-1">
                    Some categories have reached their limit (2 tokens max per category).
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isComplete && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Maximum tokens selected! You can now submit your registration or modify your selections.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}