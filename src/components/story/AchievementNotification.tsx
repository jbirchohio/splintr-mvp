import React, { useState, useEffect } from 'react'
import { Achievement } from '@/services/path.exploration.service'

interface AchievementNotificationProps {
  achievement: Achievement | null
  onClose: () => void
  duration?: number
}

export function AchievementNotification({ 
  achievement, 
  onClose, 
  duration = 5000 
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (achievement) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [achievement, duration])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }

  if (!achievement || !isVisible) return null

  const getAchievementIcon = (type: Achievement['type']) => {
    switch (type) {
      case 'first_completion':
        return '🎉'
      case 'all_paths':
        return '🗺️'
      case 'speed_run':
        return '⚡'
      case 'explorer':
        return '🔍'
      case 'completionist':
        return '👑'
      default:
        return '🏆'
    }
  }

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'first_completion':
        return 'from-green-400 to-blue-500'
      case 'all_paths':
        return 'from-purple-400 to-pink-500'
      case 'speed_run':
        return 'from-yellow-400 to-orange-500'
      case 'explorer':
        return 'from-blue-400 to-indigo-500'
      case 'completionist':
        return 'from-yellow-400 to-yellow-600'
      default:
        return 'from-gray-400 to-gray-600'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div 
        className={`
          transform transition-all duration-300 ease-out
          ${isAnimating 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-full opacity-0 scale-95'
          }
        `}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm pointer-events-auto">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getAchievementColor(achievement.type)} p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl animate-bounce">
                  {getAchievementIcon(achievement.type)}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Achievement Unlocked!</div>
                  <div className="text-white/90 text-xs">
                    {new Date(achievement.unlockedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-bold text-gray-900 text-lg mb-2">
              {achievement.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {achievement.description}
            </p>

            {/* Progress Bar (if not fully completed) */}
            {achievement.progress < achievement.maxProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{achievement.progress}/{achievement.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${getAchievementColor(achievement.type)} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium 
                         hover:bg-gray-200 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  // Could open achievements panel or share
                  handleClose()
                }}
                className={`
                  flex-1 px-3 py-2 bg-gradient-to-r ${getAchievementColor(achievement.type)} 
                  text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity
                `}
              >
                View All
              </button>
            </div>
          </div>

          {/* Animated border effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={`
              absolute inset-0 bg-gradient-to-r ${getAchievementColor(achievement.type)} 
              opacity-20 animate-pulse
            `} />
          </div>
        </div>
      </div>

      {/* Celebration particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping
              ${i % 2 === 0 ? 'animate-bounce' : ''}
            `}
            style={{
              left: `${20 + (i * 15)}%`,
              top: `${30 + (i * 10)}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${1 + (i * 0.1)}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Hook for managing achievement notifications
export function useAchievementNotifications() {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null)
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([])

  const showAchievement = (achievement: Achievement) => {
    if (currentAchievement) {
      // Queue the achievement if one is already showing
      setAchievementQueue(prev => [...prev, achievement])
    } else {
      setCurrentAchievement(achievement)
    }
  }

  const hideCurrentAchievement = () => {
    setCurrentAchievement(null)
    
    // Show next achievement in queue
    if (achievementQueue.length > 0) {
      const [nextAchievement, ...remainingQueue] = achievementQueue
      setAchievementQueue(remainingQueue)
      setTimeout(() => {
        setCurrentAchievement(nextAchievement)
      }, 500) // Small delay between achievements
    }
  }

  return {
    currentAchievement,
    showAchievement,
    hideCurrentAchievement,
    hasQueuedAchievements: achievementQueue.length > 0
  }
}