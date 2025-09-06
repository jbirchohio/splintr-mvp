import React, { useState, useEffect, useRef } from 'react'
import { Choice } from '@/types/story.types'
import { TransitionEffect } from '@/types/playback.types'

interface ImmersiveChoiceSelectorProps {
  choices: Choice[]
  onChoiceSelect: (choice: Choice) => void
  timeRemaining?: number
  isVisible: boolean
  transitionEffect?: TransitionEffect
  immersiveMode?: boolean
}

export function ImmersiveChoiceSelector({
  choices,
  onChoiceSelect,
  timeRemaining = 0,
  isVisible,
  transitionEffect = { type: 'fade', duration: 300 },
  immersiveMode = true
}: ImmersiveChoiceSelectorProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null)
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'visible' | 'exiting'>('entering')
  const choiceRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase('entering')
      const timer = setTimeout(() => setAnimationPhase('visible'), 100)
      return () => clearTimeout(timer)
    } else {
      setAnimationPhase('exiting')
    }
  }, [isVisible])

  const handleChoiceClick = (choice: Choice) => {
    if (selectedChoice) return
    
    setSelectedChoice(choice.id)
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    
    // Animate selection and then call handler
    setTimeout(() => {
      onChoiceSelect(choice)
    }, 300)
  }

  const handleChoiceHover = (choiceId: string) => {
    if (!selectedChoice) {
      setHoveredChoice(choiceId)
    }
  }

  const getChoiceButtonClasses = (choice: Choice, index: number) => {
    const isSelected = selectedChoice === choice.id
    const isHovered = hoveredChoice === choice.id
    const isDisabled = selectedChoice !== null && !isSelected

    let baseClasses = `
      relative w-full p-6 font-bold text-lg rounded-2xl transition-all duration-300
      transform-gpu backdrop-blur-sm border-2 shadow-2xl
      focus:outline-none focus:ring-4 focus:ring-blue-500/50
    `

    if (immersiveMode) {
      if (isSelected) {
        baseClasses += ` 
          bg-gradient-to-r from-blue-500 to-purple-600 border-blue-400 text-white 
          scale-105 shadow-blue-500/50 animate-pulse
        `
      } else if (isDisabled) {
        baseClasses += ` 
          bg-white/20 border-white/20 text-white/50 scale-95 blur-sm
        `
      } else if (isHovered) {
        baseClasses += ` 
          bg-white/95 border-white text-gray-900 scale-105 shadow-white/30
          shadow-2xl
        `
      } else {
        baseClasses += ` 
          bg-white/85 hover:bg-white/95 border-white/50 hover:border-white
          text-gray-900 hover:scale-105 hover:shadow-white/20
        `
      }
    } else {
      // Standard mode styling
      if (isSelected) {
        baseClasses += ` bg-blue-600 border-blue-500 text-white scale-105`
      } else if (isDisabled) {
        baseClasses += ` bg-gray-300 border-gray-300 text-gray-500 scale-95`
      } else {
        baseClasses += ` bg-white hover:bg-gray-50 border-gray-200 text-gray-900 hover:scale-102`
      }
    }

    return baseClasses
  }

  const getContainerClasses = () => {
    const baseClasses = "absolute inset-0 flex items-end justify-center z-30"
    
    if (immersiveMode) {
      return `${baseClasses} bg-gradient-to-t from-black/80 via-black/40 to-transparent`
    }
    
    return `${baseClasses} bg-black/50`
  }

  const getAnimationStyle = (index: number) => {
    const delay = index * 150
    
    if (animationPhase === 'entering') {
      return {
        animationDelay: `${delay}ms`,
        animation: `slideInUp 0.6s ease-out ${delay}ms both`
      }
    }
    
    if (animationPhase === 'exiting') {
      return {
        animationDelay: `${(choices.length - index - 1) * 100}ms`,
        animation: `slideOutDown 0.4s ease-in ${(choices.length - index - 1) * 100}ms both`
      }
    }
    
    return {}
  }

  if (!isVisible && animationPhase !== 'exiting') return null

  return (
    <div className={getContainerClasses()}>
      <div className="w-full max-w-lg mx-4 mb-8">
        
        {/* Enhanced Timer Indicator */}
        {timeRemaining > 0 && animationPhase === 'visible' && (
          <div className="text-center mb-6 animate-fadeIn">
            <div className={`text-xl font-bold mb-4 ${
              immersiveMode ? 'text-white drop-shadow-lg' : 'text-white'
            }`}>
              Choose Your Path
            </div>
            
            <div className="relative">
              <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    immersiveMode 
                      ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400' 
                      : 'bg-white'
                  }`}
                  style={{ width: `${Math.max(0, (timeRemaining / 3) * 100)}%` }}
                />
              </div>
              
              {/* Urgency indicator */}
              {timeRemaining <= 1 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping" />
              )}
              
              {/* Time remaining text */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <span className="text-white/80 text-sm font-medium">
                  {Math.ceil(timeRemaining)}s remaining
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Choice Buttons */}
        <div className="space-y-4">
          {choices.map((choice, index) => (
            <button
              key={choice.id}
              ref={el => { choiceRefs.current[choice.id] = el }}
              onClick={() => handleChoiceClick(choice)}
              onMouseEnter={() => handleChoiceHover(choice.id)}
              onMouseLeave={() => setHoveredChoice(null)}
              className={getChoiceButtonClasses(choice, index)}
              style={getAnimationStyle(index)}
              disabled={selectedChoice !== null}
              aria-label={`Choice: ${choice.text}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-left flex-1 leading-tight">
                  {choice.text}
                </span>
                
                {/* Choice indicator */}
                <div className="ml-4 flex-shrink-0">
                  {selectedChoice === choice.id ? (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  ) : hoveredChoice === choice.id ? (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <svg className="w-6 h-6 transform transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-current opacity-30" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selection ripple effect */}
              {selectedChoice === choice.id && (
                <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* No choices indicator */}
        {choices.length === 0 && (
          <div className="text-center text-white animate-fadeIn">
            <div className="text-4xl mb-4 animate-bounce">🎉</div>
            <div className="text-2xl font-bold mb-2">Story Complete!</div>
            <div className="text-lg opacity-75">Tap anywhere to continue</div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideOutDown {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}