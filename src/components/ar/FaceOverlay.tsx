"use client"
import React, { useEffect, useRef } from 'react'

type Props = {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled?: boolean
}

export function FaceOverlay({ videoRef, enabled = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function initDetector() {
      try {
        // Use Shape Detection API if available
        const supported = (window as any).FaceDetector
        if (!supported) return
        if (!detectorRef.current) {
          detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 2 })
        }
        loop()
      } catch (e) {
        // no-op
      }
    }

    function draw(faces: any[]) {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      // Match canvas size to video client size
      const rect = video.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width))
      canvas.height = Math.max(1, Math.floor(rect.height))
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = 'rgba(0,255,255,0.9)'
      ctx.lineWidth = 2
      for (const face of faces) {
        const box = face.boundingBox as DOMRectReadOnly
        // The FaceDetector returns coordinates relative to the rendered element
        // Draw a simple AR overlay: glasses-like rectangle near eyes area
        const x = box.x
        const y = box.y + box.height * 0.35
        const w = box.width
        const h = box.height * 0.2
        // Frame
        ctx.strokeRect(x, y, w, h)
        // Lenses
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        const lensW = w * 0.4
        const lensH = h * 0.8
        const gap = w * 0.05
        ctx.fillRect(x + w * 0.05, y + h * 0.1, lensW, lensH)
        ctx.fillRect(x + w * 0.55, y + h * 0.1, lensW, lensH)
        // Bridge
        ctx.fillRect(x + w * 0.48, y + h * 0.4, w * 0.04, h * 0.2)
      }
    }

    async function loop() {
      if (cancelled) return
      try {
        const video = videoRef.current
        if (video && detectorRef.current && video.readyState >= 2) {
          // Detect on the painted size by drawing video frame to an offscreen canvas
          // However, FaceDetector works directly on the element in many browsers
          const faces = await detectorRef.current.detect(video)
          draw(faces || [])
        }
      } catch {
        // ignore detection errors, keep looping
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    initDetector()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, videoRef])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

