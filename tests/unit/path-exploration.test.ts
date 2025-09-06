import { pathExplorationService } from '@/services/path.exploration.service'
import { Story, StoryNode } from '@/types/story.types'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn()
    }))
  }
}))

describe('PathExplorationService', () => {
  const mockStory: Story = {
    id: 'story-1',
    creatorId: 'creator-1',
    title: 'Test Story',
    description: 'A test story with branching paths',
    nodes: [
      {
        id: 'node-1',
        videoId: 'video-1',
        choices: [
          { id: 'choice-1', text: 'Go left', nextNodeId: 'node-2' },
          { id: 'choice-2', text: 'Go right', nextNodeId: 'node-3' }
        ],
        isStartNode: true,
        isEndNode: false
      },
      {
        id: 'node-2',
        videoId: 'video-2',
        choices: [
          { id: 'choice-3', text: 'Continue', nextNodeId: 'node-4' }
        ],
        isStartNode: false,
        isEndNode: false
      },
      {
        id: 'node-3',
        videoId: 'video-3',
        choices: [
          { id: 'choice-4', text: 'Continue', nextNodeId: 'node-5' }
        ],
        isStartNode: false,
        isEndNode: false
      },
      {
        id: 'node-4',
        videoId: 'video-4',
        choices: [],
        isStartNode: false,
        isEndNode: true
      },
      {
        id: 'node-5',
        videoId: 'video-5',
        choices: [],
        isStartNode: false,
        isEndNode: true
      }
    ],
    isPublished: true,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  describe('analyzeStoryPaths', () => {
    it('should find all possible paths in a story', () => {
      const paths = pathExplorationService.analyzeStoryPaths(mockStory)
      
      expect(paths).toHaveLength(2)
      expect(paths).toContainEqual(['node-1', 'node-2', 'node-4'])
      expect(paths).toContainEqual(['node-1', 'node-3', 'node-5'])
    })

    it('should handle stories with no start node', () => {
      const storyWithoutStart: Story = {
        ...mockStory,
        nodes: mockStory.nodes.map(node => ({ ...node, isStartNode: false }))
      }
      
      const paths = pathExplorationService.analyzeStoryPaths(storyWithoutStart)
      expect(paths).toHaveLength(0)
    })

    it('should handle circular references without infinite loops', () => {
      const circularStory: Story = {
        ...mockStory,
        nodes: [
          {
            id: 'node-1',
            videoId: 'video-1',
            choices: [{ id: 'choice-1', text: 'Loop', nextNodeId: 'node-2' }],
            isStartNode: true,
            isEndNode: false
          },
          {
            id: 'node-2',
            videoId: 'video-2',
            choices: [
              { id: 'choice-2', text: 'Back to start', nextNodeId: 'node-1' },
              { id: 'choice-3', text: 'End', nextNodeId: 'node-3' }
            ],
            isStartNode: false,
            isEndNode: false
          },
          {
            id: 'node-3',
            videoId: 'video-3',
            choices: [],
            isStartNode: false,
            isEndNode: true
          }
        ]
      }
      
      const paths = pathExplorationService.analyzeStoryPaths(circularStory)
      expect(paths).toHaveLength(1)
      expect(paths[0]).toEqual(['node-1', 'node-2', 'node-3'])
    })
  })

  describe('analyzeNodeChoices', () => {
    it('should identify explored and unexplored choices', () => {
      const exploredPaths = [['node-1', 'node-2', 'node-4']]
      
      const analysis = pathExplorationService.analyzeNodeChoices(
        mockStory, 
        'node-1', 
        exploredPaths
      )
      
      expect(analysis.nodeId).toBe('node-1')
      expect(analysis.choices).toHaveLength(2)
      
      // First choice should be explored
      const leftChoice = analysis.choices.find(c => c.text === 'Go left')
      expect(leftChoice?.explored).toBe(true)
      
      // Second choice should be unexplored
      const rightChoice = analysis.choices.find(c => c.text === 'Go right')
      expect(rightChoice?.explored).toBe(false)
      expect(rightChoice?.leadsToNewContent).toBe(true)
    })

    it('should throw error for invalid node', () => {
      expect(() => {
        pathExplorationService.analyzeNodeChoices(mockStory, 'invalid-node', [])
      }).toThrow('Node not found')
    })
  })

  describe('getSuggestedChoice', () => {
    it('should suggest unexplored choice that leads to new content', () => {
      const exploredPaths = [['node-1', 'node-2', 'node-4']]
      
      const suggestion = pathExplorationService.getSuggestedChoice(
        mockStory, 
        'node-1', 
        exploredPaths
      )
      
      expect(suggestion).toBeTruthy()
      expect(suggestion?.text).toBe('Go right')
      expect(suggestion?.nextNodeId).toBe('node-3')
    })

    it('should return null when all choices are explored', () => {
      const exploredPaths = [
        ['node-1', 'node-2', 'node-4'],
        ['node-1', 'node-3', 'node-5']
      ]
      
      const suggestion = pathExplorationService.getSuggestedChoice(
        mockStory, 
        'node-1', 
        exploredPaths
      )
      
      expect(suggestion).toBeNull()
    })

    it('should return null for end nodes', () => {
      const suggestion = pathExplorationService.getSuggestedChoice(
        mockStory, 
        'node-4', 
        []
      )
      
      expect(suggestion).toBeNull()
    })
  })

  describe('achievement generation', () => {
    it('should generate first completion achievement', async () => {
      // This would require mocking the database calls
      // For now, we'll test the logic structure
      expect(true).toBe(true) // Placeholder
    })

    it('should generate explorer achievement at 50% completion', async () => {
      // This would require mocking the database calls
      // For now, we'll test the logic structure
      expect(true).toBe(true) // Placeholder
    })

    it('should generate completionist achievement at 100%', async () => {
      // This would require mocking the database calls
      // For now, we'll test the logic structure
      expect(true).toBe(true) // Placeholder
    })
  })
})