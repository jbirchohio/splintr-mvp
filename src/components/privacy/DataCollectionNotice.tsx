'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DataCollectionNoticeProps {
  context: 'signup' | 'video-upload' | 'story-creation' | 'profile-update'
}

const contextMessages = {
  signup: {
    title: 'Account Creation Data Collection',
    description: 'When you create an account, we collect:',
    dataPoints: [
      'Your name and email address from your Google/Apple account',
      'Profile picture (if you choose to add one)',
      'Account creation timestamp',
      'Authentication provider information'
    ]
  },
  'video-upload': {
    title: 'Video Upload Data Collection',
    description: 'When you upload videos, we collect:',
    dataPoints: [
      'Video file and metadata (duration, size, format)',
      'Upload timestamp and processing status',
      'Automatic content moderation results',
      'Video thumbnails generated from your content'
    ]
  },
  'story-creation': {
    title: 'Story Creation Data Collection',
    description: 'When you create interactive stories, we collect:',
    dataPoints: [
      'Story title, description, and branching structure',
      'Associated video clips and choice options',
      'Creation and publication timestamps',
      'Story performance metrics (views, completion rates)'
    ]
  },
  'profile-update': {
    title: 'Profile Update Data Collection',
    description: 'When you update your profile, we collect:',
    dataPoints: [
      'Updated name and profile information',
      'New profile picture (if uploaded)',
      'Profile modification timestamps',
      'Previous profile data for audit purposes'
    ]
  }
}

export default function DataCollectionNotice({ context }: DataCollectionNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const contextData = contextMessages[context]

  if (isDismissed) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-semibold text-blue-900">
              {contextData.title}
            </h3>
          </div>
          
          <p className="text-sm text-blue-800 mb-3">
            {contextData.description}
          </p>

          {isExpanded && (
            <div className="mb-4">
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                {contextData.dataPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Your Rights:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• You can request a copy of all your data at any time</li>
                  <li>• You can delete your account and all associated data</li>
                  <li>• You can update or correct your information</li>
                  <li>• You can opt out of non-essential data collection</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {isExpanded ? 'Show Less' : 'Learn More'}
            </button>
            
            <Link 
              href="/privacy" 
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Privacy Policy
            </Link>
            
            <Link 
              href="/terms" 
              className="text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="ml-4 text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss notice"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}