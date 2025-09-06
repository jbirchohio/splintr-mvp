import React from 'react'
import { ValidationResult } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/utils/helpers'

interface StoryValidationPanelProps {
  validation: ValidationResult | null
  isValidating: boolean
  onValidate: () => void
}

export function StoryValidationPanel({
  validation,
  isValidating,
  onValidate
}: StoryValidationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Story Validation</h3>
          <Button
            onClick={onValidate}
            disabled={isValidating}
            variant="outline"
            size="sm"
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Check your story structure for completeness
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isValidating ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Validating story...</p>
            </div>
          </div>
        ) : validation ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className={cn(
              'p-3 rounded-lg border',
              validation.isValid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-center">
                {validation.isValid ? (
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={cn(
                  'font-medium text-sm',
                  validation.isValid ? 'text-green-800' : 'text-red-800'
                )}>
                  {validation.isValid ? 'Story is valid' : 'Story has issues'}
                </span>
              </div>
              {validation.isValid && (
                <p className="text-sm text-green-700 mt-1">
                  Your story structure is complete and ready for publishing.
                </p>
              )}
            </div>

            {/* Validation Errors */}
            {validation.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Issues Found ({validation.errors.length})
                </h4>
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Guidelines */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Validation Requirements
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Story must have at least one node</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Exactly one start node required</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>At least one end node required</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Each node must have a video</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Non-end nodes must have exactly 2 choices</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>All choices must have text and valid links</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>All nodes must be reachable from start</span>
                </div>
              </div>
            </div>

            {/* Publishing Status */}
            {validation.isValid ? (
              <Alert variant="success">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Ready to publish!</span>
                </div>
                <p className="text-sm mt-1">
                  Your story meets all requirements and can be published.
                </p>
              </Alert>
            ) : (
              <Alert variant="warning">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Cannot publish yet</span>
                </div>
                <p className="text-sm mt-1">
                  Fix the validation issues above before publishing.
                </p>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Click "Validate" to check your story</p>
          </div>
        )}
      </div>
    </div>
  )
}