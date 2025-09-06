import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryEditor } from '@/components/story/StoryEditor'
import { Story } from '@/types/story.types'

// Mock the story service
jest.mock('@/services/story.service', () => ({
  storyService: {
    validateStoryStructure: jest.fn(() => ({
      isValid: true,
      errors: []
    }))
  }
}))

describe('StoryEditor', () => {
  const mockStory: Story = {
    id: 'test-story',
    creatorId: 'test-user',
    title: 'Test Story',
    description: 'A test story',
    nodes: [
      {
        id: 'node-1',
        videoId: 'video-1',
        choices: [
          { id: 'choice-1', text: 'Choice A', nextNodeId: 'node-2' },
          { id: 'choice-2', text: 'Choice B', nextNodeId: 'node-3' }
        ],
        isStartNode: true,
        isEndNode: false
      },
      {
        id: 'node-2',
        videoId: 'video-2',
        choices: [],
        isStartNode: false,
        isEndNode: true
      }
    ],
    isPublished: false,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('renders story editor with title and description', () => {
    render(<StoryEditor story={mockStory} />)
    
    expect(screen.getByDisplayValue('Test Story')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test story')).toBeInTheDocument()
  })

  it('displays story nodes in the sidebar', () => {
    render(<StoryEditor story={mockStory} />)
    
    expect(screen.getByText('Node 1')).toBeInTheDocument()
    expect(screen.getByText('Node 2')).toBeInTheDocument()
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('End')).toBeInTheDocument()
  })

  it('allows adding new nodes', () => {
    const onSave = jest.fn()
    render(<StoryEditor story={mockStory} onSave={onSave} />)
    
    const addButton = screen.getByText('Add Node')
    fireEvent.click(addButton)
    
    // Should show a new node in the list
    expect(screen.getByText('Node 3')).toBeInTheDocument()
  })

  it('switches between editor and tree view', () => {
    render(<StoryEditor story={mockStory} />)
    
    const treeViewButton = screen.getByText('Tree View')
    fireEvent.click(treeViewButton)
    
    // Should switch to tree view mode
    expect(screen.getByText('Reset Layout')).toBeInTheDocument()
  })

  it('shows validation panel', () => {
    render(<StoryEditor story={mockStory} />)
    
    expect(screen.getByText('Story Validation')).toBeInTheDocument()
    expect(screen.getByText('Validate')).toBeInTheDocument()
  })
})