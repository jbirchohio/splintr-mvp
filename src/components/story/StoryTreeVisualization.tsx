import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Story, StoryNode } from '@/types/story.types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

interface Position {
  x: number
  y: number
}

interface NodePosition extends Position {
  id: string
  node: StoryNode
}

interface StoryTreeVisualizationProps {
  story: Story
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onNodeUpdate: (nodeId: string, updates: Partial<StoryNode>) => void
  onNodeDelete: (nodeId: string) => void
}

export function StoryTreeVisualization({
  story,
  selectedNodeId,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete
}: StoryTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 })

  // Calculate initial positions for nodes
  const calculateNodePositions = useCallback(() => {
    if (story.nodes.length === 0) return []

    const positions: NodePosition[] = []
    const nodeWidth = 200
    const nodeHeight = 120
    const horizontalSpacing = 300
    const verticalSpacing = 200

    // Find start node
    const startNode = story.nodes.find(node => node.isStartNode)
    if (!startNode) return []

    // Position start node at the top center
    positions.push({
      id: startNode.id,
      node: startNode,
      x: 500,
      y: 100
    })

    // Use BFS to position other nodes
    const visited = new Set<string>([startNode.id])
    const queue: Array<{ nodeId: string; level: number; parentX: number }> = []

    // Add children of start node to queue
    startNode.choices.forEach((choice, index) => {
      if (choice.nextNodeId) {
        queue.push({
          nodeId: choice.nextNodeId,
          level: 1,
          parentX: 500
        })
      }
    })

    const levelNodes: { [level: number]: string[] } = {}

    while (queue.length > 0) {
      const { nodeId, level, parentX } = queue.shift()!
      
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const node = story.nodes.find(n => n.id === nodeId)
      if (!node) continue

      // Track nodes at each level
      if (!levelNodes[level]) levelNodes[level] = []
      levelNodes[level].push(nodeId)

      // Calculate position
      const nodesAtLevel = levelNodes[level].length
      const levelWidth = Math.max(1, levelNodes[level].length) * horizontalSpacing
      const startX = parentX - levelWidth / 2 + (nodesAtLevel - 1) * horizontalSpacing

      positions.push({
        id: nodeId,
        node,
        x: startX,
        y: 100 + level * verticalSpacing
      })

      // Add children to queue
      node.choices.forEach(choice => {
        if (choice.nextNodeId && !visited.has(choice.nextNodeId)) {
          queue.push({
            nodeId: choice.nextNodeId,
            level: level + 1,
            parentX: startX
          })
        }
      })
    }

    return positions
  }, [story.nodes])

  // Update positions when story changes
  useEffect(() => {
    const positions = calculateNodePositions()
    setNodePositions(positions)
  }, [calculateNodePositions])

  // Handle node drag start
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const nodePos = nodePositions.find(p => p.id === nodeId)
    if (!nodePos) return

    setDraggedNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - nodePos.x,
      y: e.clientY - rect.top - nodePos.y
    })
  }

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.left - dragOffset.x
    const newY = e.clientY - rect.top - dragOffset.y

    setNodePositions(prev => prev.map(pos => 
      pos.id === draggedNode 
        ? { ...pos, x: newX, y: newY }
        : pos
    ))
  }, [draggedNode, dragOffset])

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  // Add global mouse event listeners
  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedNode, handleMouseMove, handleMouseUp])

  // Get connections between nodes
  const getConnections = () => {
    const connections: Array<{
      from: Position
      to: Position
      choiceText: string
    }> = []

    nodePositions.forEach(nodePos => {
      nodePos.node.choices.forEach(choice => {
        if (choice.nextNodeId) {
          const targetPos = nodePositions.find(p => p.id === choice.nextNodeId)
          if (targetPos) {
            connections.push({
              from: { x: nodePos.x + 100, y: nodePos.y + 60 }, // Center bottom of node
              to: { x: targetPos.x + 100, y: targetPos.y }, // Center top of target
              choiceText: choice.text
            })
          }
        }
      })
    })

    return connections
  }

  const connections = getConnections()

  if (story.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-600 mt-4">No story nodes to visualize</p>
          <p className="text-sm text-gray-500 mt-1">
            Add some nodes in the editor to see the story tree
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex space-x-2">
          <Button
            onClick={() => setNodePositions(calculateNodePositions())}
            variant="outline"
            size="sm"
          >
            Reset Layout
          </Button>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        {/* Connections */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6B7280"
            />
          </marker>
        </defs>

        {connections.map((connection, index) => {
          const midX = (connection.from.x + connection.to.x) / 2
          const midY = (connection.from.y + connection.to.y) / 2

          return (
            <g key={index}>
              {/* Connection line */}
              <path
                d={`M ${connection.from.x} ${connection.from.y} Q ${midX} ${connection.from.y + 50} ${connection.to.x} ${connection.to.y}`}
                stroke="#6B7280"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
              
              {/* Choice text */}
              {connection.choiceText && (
                <text
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  style={{ fontSize: '12px' }}
                >
                  <tspan
                    x={midX}
                    dy="0"
                    className="fill-white stroke-white"
                    strokeWidth="3"
                  >
                    {connection.choiceText}
                  </tspan>
                  <tspan
                    x={midX}
                    dy="0"
                    className="fill-gray-600"
                  >
                    {connection.choiceText}
                  </tspan>
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodePositions.map((nodePos) => (
          <g key={nodePos.id}>
            {/* Node background */}
            <rect
              x={nodePos.x}
              y={nodePos.y}
              width="200"
              height="120"
              rx="8"
              fill={selectedNodeId === nodePos.id ? '#EBF8FF' : '#FFFFFF'}
              stroke={selectedNodeId === nodePos.id ? '#3B82F6' : '#E5E7EB'}
              strokeWidth={selectedNodeId === nodePos.id ? '2' : '1'}
              className="cursor-pointer"
              onMouseDown={(e) => handleMouseDown(e, nodePos.id)}
              onClick={() => onNodeSelect(nodePos.id)}
            />

            {/* Node type indicator */}
            <rect
              x={nodePos.x}
              y={nodePos.y}
              width="200"
              height="24"
              rx="8"
              fill={
                nodePos.node.isStartNode ? '#10B981' :
                nodePos.node.isEndNode ? '#EF4444' : '#6B7280'
              }
            />

            {/* Node type text */}
            <text
              x={nodePos.x + 100}
              y={nodePos.y + 16}
              textAnchor="middle"
              className="text-xs font-medium fill-white"
              style={{ fontSize: '11px' }}
            >
              {nodePos.node.isStartNode ? 'START' : 
               nodePos.node.isEndNode ? 'END' : 'MIDDLE'}
            </text>

            {/* Video status */}
            <text
              x={nodePos.x + 10}
              y={nodePos.y + 45}
              className="text-sm font-medium fill-gray-900"
              style={{ fontSize: '14px' }}
            >
              {nodePos.node.videoId ? '📹 Video attached' : '⚠️ No video'}
            </text>

            {/* Choices count */}
            <text
              x={nodePos.x + 10}
              y={nodePos.y + 65}
              className="text-xs fill-gray-600"
              style={{ fontSize: '12px' }}
            >
              {nodePos.node.choices.length} choice(s)
            </text>

            {/* Node actions */}
            <g className="opacity-0 hover:opacity-100 transition-opacity">
              {/* Delete button */}
              <circle
                cx={nodePos.x + 185}
                cy={nodePos.y + 15}
                r="8"
                fill="#EF4444"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeDelete(nodePos.id)
                }}
              />
              <text
                x={nodePos.x + 185}
                y={nodePos.y + 19}
                textAnchor="middle"
                className="text-xs font-bold fill-white cursor-pointer"
                style={{ fontSize: '10px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeDelete(nodePos.id)
                }}
              >
                ×
              </text>
            </g>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h4 className="text-xs font-medium text-gray-900 mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Start Node</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
            <span className="text-gray-600">Middle Node</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-600">End Node</span>
          </div>
        </div>
      </div>
    </div>
  )
}