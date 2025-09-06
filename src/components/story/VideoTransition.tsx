import React, { useEffect, useState } from 'react'
import { TransitionEffect } from '@/types/playback.types'

interface VideoTransitionProps {
  isTransitioning: boolean
  transitionEffect: TransitionEffect
  onTransitionComplete: () => void
  children: React.ReactNode
}

export function VideoTransition({
  isTransitioning,
  transitionEffect,
  onTransitionComplete,
  children
}: VideoTransitionProps) {
  const [transitionState, setTransitionState] = useState<'idle' | 'out' | 'in'>('idle')

  useEffect(() => {
    if (isTransitioning) {
      setTransitionState('out')
      
      const timer = setTimeout(() => {
        setTransitionState('in')
        onTransitionComplete()
      }, transitionEffect.duration / 2)

      return () => clearTimeout(timer)
    } else {
      setTransitionState('idle')
    }
  }, [isTransitioning, transitionEffect.duration, onTransitionComplete])

  const getTransitionClasses = () => {
    const baseDuration = `duration-${transitionEffect.duration}`
    
    switch (transitionEffect.type) {
      case 'fade':
        return {
          container: `transition-opacity ${baseDuration}`,
          opacity: transitionState === 'out' ? 'opacity-0' : 'opacity-100'
        }
      
      case 'slide':
        const direction = transitionEffect.direction || 'right'
        const slideClass = {
          left: transitionState === 'out' ? '-translate-x-full' : 'translate-x-0',
          right: transitionState === 'out' ? 'translate-x-full' : 'translate-x-0',
          up: transitionState === 'out' ? '-translate-y-full' : 'translate-y-0',
          down: transitionState === 'out' ? 'translate-y-full' : 'translate-y-0'
        }[direction]
        
        return {
          container: `transition-transform ${baseDuration} ease-in-out`,
          transform: slideClass
        }
      
      case 'cut':
        return {
          container: '',
          display: transitionState === 'out' ? 'hidden' : 'block'
        }
      
      default:
        return {
          container: `transition-all ${baseDuration}`,
          opacity: transitionState === 'out' ? 'opacity-0' : 'opacity-100'
        }
    }
  }

  const transitionClasses = getTransitionClasses()

  return (
    <div className={`relative w-full h-full ${transitionClasses.container}`}>
      <div 
        className={`w-full h-full ${Object.values(transitionClasses).slice(1).join(' ')}`}
      >
        {children}
      </div>
      
      {/* Transition overlay effects */}
      {isTransitioning && transitionEffect.type === 'fade' && (
        <div className="absolute inset-0 bg-black pointer-events-none" 
             style={{ 
               opacity: transitionState === 'out' ? 1 : 0,
               transition: `opacity ${transitionEffect.duration}ms ease-in-out`
             }} 
        />
      )}
      
      {/* Loading indicator during transition */}
      {transitionState === 'out' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white mx-auto mb-2"></div>
            <div className="text-sm font-medium">Loading next scene...</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing video transitions
export function useVideoTransition(transitionEffect: TransitionEffect = { type: 'fade', duration: 300 }) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null)
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('')

  const startTransition = (newVideoUrl: string) => {
    if (newVideoUrl === currentVideoUrl) return
    
    setPendingVideoUrl(newVideoUrl)
    setIsTransitioning(true)
  }

  const completeTransition = () => {
    if (pendingVideoUrl) {
      setCurrentVideoUrl(pendingVideoUrl)
      setPendingVideoUrl(null)
    }
    setIsTransitioning(false)
  }

  return {
    isTransitioning,
    currentVideoUrl,
    startTransition,
    completeTransition,
    TransitionWrapper: ({ children }: { children: React.ReactNode }) => (
      <VideoTransition
        isTransitioning={isTransitioning}
        transitionEffect={transitionEffect}
        onTransitionComplete={completeTransition}
      >
        {children}
      </VideoTransition>
    )
  }
}