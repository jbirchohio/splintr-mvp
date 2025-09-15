import React, { useState } from 'react'
import { StoryNode, Choice } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { VideoSelector } from './VideoSelector'
import { ChoiceEditor } from './ChoiceEditor'
import { cn } from '@/utils/helpers'
import { useEffect } from 'react'

interface StoryNodeEditorProps {
  node: StoryNode
  availableNodes: { node: StoryNode; displayIndex: number }[]
  onNodeUpdate: (updates: Partial<StoryNode>) => void
  onChoiceAdd: () => void
  onChoiceUpdate: (choiceId: string, updates: Partial<Choice>) => void
  onChoiceDelete: (choiceId: string) => void
}

export function StoryNodeEditor({
  node,
  availableNodes,
  onNodeUpdate,
  onChoiceAdd,
  onChoiceUpdate,
  onChoiceDelete
}: StoryNodeEditorProps) {
  const [showVideoSelector, setShowVideoSelector] = useState(false)
  const [effects, setEffects] = useState<{ code: string; name: string; params: any }[]>([])
  const [stickers, setStickers] = useState<{ code: string; name: string; public_id: string }[]>([])
  const [tracks, setTracks] = useState<{ id: string; title: string; artist: string }[]>([])
  const [selectedEffect, setSelectedEffect] = useState<string>('')
  const [textOverlay, setTextOverlay] = useState<{ text: string; size: number; color: string }>({ text: '', size: 36, color: '#FFFFFF' })
  const [selectedStickers, setSelectedStickers] = useState<{ stickerCode: string; x?: number; y?: number; width?: number; height?: number }[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string>('')
  const [applyBusy, setApplyBusy] = useState(false)
  const [applyResultUrl, setApplyResultUrl] = useState<string>('')
  const [applyError, setApplyError] = useState<string>('')
  const [videoUrl, setVideoUrl] = useState<string>('')

  useEffect(() => {
    // Load libraries
    ;(async () => {
      try {
        const [e, s, a] = await Promise.all([
          fetch('/api/library/effects').then(r => r.json()),
          fetch('/api/library/stickers').then(r => r.json()),
          fetch('/api/library/audio-tracks').then(r => r.json())
        ])
        setEffects(e.presets || [])
        setStickers(s.stickers || [])
        setTracks((a.tracks || []).map((t: any) => ({ id: t.id, title: t.title, artist: t.artist })))
      } catch {}
    })()
  }, [])

  useEffect(() => {
    // Fetch selected video's streamingUrl to use as source for transforms
    ;(async () => {
      if (!node.videoId) { setVideoUrl(''); return }
      try {
        const res = await fetch('/api/videos?status=completed')
        const json = await res.json()
        const v = (json.videos || []).find((v: any) => v.id === node.videoId)
        setVideoUrl(v?.streamingUrl || '')
      } catch { setVideoUrl('') }
    })()
  }, [node.videoId])

  const handleVideoSelect = (videoId: string) => {
    onNodeUpdate({ videoId })
    setShowVideoSelector(false)
  }

  const handleNodeTypeChange = (type: 'start' | 'middle' | 'end') => {
    const updates: Partial<StoryNode> = {
      isStartNode: type === 'start',
      isEndNode: type === 'end'
    }

    // If changing to end node, remove all choices
    if (type === 'end') {
      updates.choices = []
    }

    onNodeUpdate(updates)
  }

  const getNodeType = () => {
    if (node.isStartNode) return 'start'
    if (node.isEndNode) return 'end'
    return 'middle'
  }

  const canAddChoice = node.choices.length < 2 && !node.isEndNode

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div aria-hidden={showVideoSelector} className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Edit Node</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure the video and choices for this story node
        </p>
      </div>

      {/* Content */}
      <div aria-hidden={showVideoSelector} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Node Type
          </label>
          <div className="flex space-x-3">
            {[
              { value: 'start', label: 'Start Node', description: 'First node in the story' },
              { value: 'middle', label: 'Middle Node', description: 'Continues the story' },
              { value: 'end', label: 'End Node', description: 'Concludes the story path' }
            ].map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => handleNodeTypeChange(value as 'start' | 'middle' | 'end')}
                className={cn(
                  'flex-1 p-3 rounded-lg border text-left transition-colors',
                  getNodeType() === value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                )}
              >
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs mt-1 opacity-75">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Video Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Video Content
          </label>
          
          {node.videoId ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Video Selected</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {node.videoId}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowVideoSelector(true)}
                    variant="outline"
                    size="sm"
                  >
                    Change Video
                  </Button>
                  <Button
                    onClick={() => onNodeUpdate({ videoId: '' })}
                    variant="ghost"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
              {/* Effects and Overlays Panel */}
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Effects & Overlays</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Effect Preset</label>
                    <select className="w-full border rounded p-2 text-sm" value={selectedEffect} onChange={(e) => setSelectedEffect(e.target.value)}>
                      <option value="">None</option>
                      {effects.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Text Overlay</label>
                    <div className="flex items-center space-x-2">
                      <input className="flex-1 border rounded p-2 text-sm" placeholder="Text" value={textOverlay.text} onChange={e => setTextOverlay({ ...textOverlay, text: e.target.value })} />
                      <input className="w-16 border rounded p-2 text-sm" type="number" min={10} max={96} value={textOverlay.size} onChange={e => setTextOverlay({ ...textOverlay, size: parseInt(e.target.value || '36') })} />
                      <input className="w-10 h-10 border rounded" type="color" value={textOverlay.color} onChange={e => setTextOverlay({ ...textOverlay, color: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Stickers</label>
                  <div className="flex flex-wrap gap-2">
                    {stickers.map(s => {
                      const selected = selectedStickers.find(ss => ss.stickerCode === s.code)
                      return (
                        <button key={s.code} onClick={() => {
                          if (selected) setSelectedStickers(prev => prev.filter(ss => ss.stickerCode !== s.code))
                          else setSelectedStickers(prev => [...prev, { stickerCode: s.code }])
                        }} className={cn('px-2 py-1 rounded border text-xs', selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>{s.name}</button>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Audio Track (optional)</label>
                  <select className="w-full border rounded p-2 text-sm" value={selectedTrackId} onChange={(e) => setSelectedTrackId(e.target.value)}>
                    <option value="">None</option>
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>{t.title} — {t.artist}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">Audio plays in viewer; to mux into video, we’ll add a merge step later.</p>
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <Button disabled={applyBusy || !videoUrl} onClick={async () => {
                    setApplyBusy(true); setApplyResultUrl(''); setApplyError('')
                    try {
                      // Build params
                      const preset = effects.find(p => p.code === selectedEffect)
                      const params: any = { effects: preset?.params?.effects || {} }
                      if (textOverlay.text) params.textOverlay = { text: textOverlay.text, size: textOverlay.size, color: textOverlay.color }
                      if (selectedStickers.length) params.stickerOverlays = selectedStickers
                      const res = await fetch('/api/videos/transform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: node.videoId, sourceUrl: videoUrl, params }) })
                      const json = await res.json()
                      if (!res.ok) throw new Error(json.error || 'Transform failed')
                      setApplyResultUrl(json.url || '')
                    } catch (e: any) {
                      setApplyError(e.message)
                    } finally { setApplyBusy(false) }
                  }}>Apply Transform</Button>
                  {!videoUrl && (
                    <span className="text-xs text-gray-500">Video URL not found for transform</span>
                  )}
                </div>
                {applyError && (<Alert variant="error" className="mt-2">{applyError}</Alert>)}
                {applyResultUrl && (
                  <div className="mt-2 text-xs">
                    <a href={applyResultUrl} target="_blank" className="text-blue-600 underline">View derived video</a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-500 mb-3">
                <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-3">No video selected</p>
              <Button
                onClick={() => setShowVideoSelector(true)}
                variant="outline"
                size="sm"
              >
                Select Video
              </Button>
            </div>
          )}
        </div>

        {/* Choices Section */}
        {!node.isEndNode && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Choices ({node.choices.length}/2)
              </label>
              {canAddChoice && (
                <Button
                  onClick={onChoiceAdd}
                  variant="outline"
                  size="sm"
                >
                  Add Choice
                </Button>
              )}
            </div>

            {node.choices.length > 0 ? (
              <div className="space-y-3">
                {node.choices.map((choice, index) => (
                  <ChoiceEditor
                    key={choice.id}
                    choice={choice}
                    index={index}
                    availableNodes={availableNodes}
                    onUpdate={(updates) => onChoiceUpdate(choice.id, updates)}
                    onDelete={() => onChoiceDelete(choice.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No choices added yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add up to 2 choices for viewers to select from
                </p>
              </div>
            )}

            {node.choices.length >= 2 && (
              <Alert variant="info" className="mt-3">
                Maximum of 2 choices per node (as per requirements)
              </Alert>
            )}
          </div>
        )}

        {/* End Node Info */}
        {node.isEndNode && (
          <Alert variant="success">
            This is an end node. Viewers will reach a conclusion when they arrive here.
          </Alert>
        )}

        {/* Validation Warnings */}
        {!node.videoId && (
          <Alert variant="warning">
            This node needs a video to be complete.
          </Alert>
        )}

        {!node.isEndNode && node.choices.length === 0 && (
          <Alert variant="warning">
            Intermediate nodes should have at least one choice.
          </Alert>
        )}

        {!node.isEndNode && node.choices.length === 1 && (
          <Alert variant="info">
            Consider adding a second choice to give viewers more options.
          </Alert>
        )}
      </div>

      {/* Video Selector Modal */}
      {showVideoSelector && (
        <VideoSelector
          onSelect={handleVideoSelect}
          onClose={() => setShowVideoSelector(false)}
        />
      )}
    </div>
  )
}
