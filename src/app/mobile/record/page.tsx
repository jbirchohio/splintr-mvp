"use client"
import { useEffect, useRef, useState } from 'react'
import { pickOrRecordVideo } from '@/lib/native/camera'

export default function RecordPage() {
  const [src, setSrc] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Record Video</h1>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded bg-[color:var(--primary-600)] text-white" onClick={async () => {
          const url = await pickOrRecordVideo(); if (url) setSrc(url)
        }}>Record 5s</button>
        <input type="file" accept="video/*" capture="user" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)) }} />
      </div>
      {src && (
        <div>
          <video ref={videoRef} src={src} controls className="w-full max-w-sm rounded" />
          <div className="mt-2 flex gap-2">
            <button className="px-3 py-1.5 rounded bg-black text-white" onClick={async () => {
              try { const blob = await (await fetch(src)).blob(); const file = new File([blob], 'recorded.webm', { type: blob.type }); const form = new FormData(); form.append('video', file); const r = await fetch('/api/videos', { method: 'POST', body: form }); const j = await r.json(); alert(r.ok ? 'Uploaded' : 'Upload failed: '+(j.error||'')) } catch {}
            }}>Upload</button>
            <button className="px-3 py-1.5 rounded border" onClick={() => setSrc(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}

