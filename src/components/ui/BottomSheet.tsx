"use client"
import React, { useEffect } from 'react'
import { cn } from '@/utils/helpers'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function BottomSheet({ isOpen, onClose, children, title, className }: BottomSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn("absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[80vh] overflow-auto", className)}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
        {title && <div className="text-base font-semibold mb-2 text-center">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}

