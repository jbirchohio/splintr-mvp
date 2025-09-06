import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedItem } from '@/components/feed/FeedItem';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { FeedType } from '@/types/feed.types';

// Mock Next.js components
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

describe('Feed Components', () => {
  const mockFeedItem = {
    storyId: 'story-1',
    creatorId: 'creator-1',
    creatorName: 'John Doe',
    creatorAvatar: 'https://example.com/avatar.jpg',
    title: 'Test Interactive Story',
    description: 'A test story description',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    viewCount: 1250,
    publishedAt: '2024-01-01T00:00:00Z',
    engagementScore: 85
  };

  describe('FeedItem', () => {
    it('renders story information correctly', () => {
      render(
        <FeedItem 
          item={mockFeedItem}
          onView={jest.fn()}
          onLaunch={jest.fn()}
        />
      );

      expect(screen.getByText('Test Interactive Story')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('A test story description')).toBeInTheDocument();
      expect(screen.getByText('1.3K')).toBeInTheDocument(); // Formatted view count
    });

    it('handles missing thumbnail gracefully', () => {
      const itemWithoutThumbnail = { ...mockFeedItem, thumbnailUrl: undefined };
      
      render(
        <FeedItem 
          item={itemWithoutThumbnail}
          onView={jest.fn()}
          onLaunch={jest.fn()}
        />
      );

      // Should show placeholder icon instead of image
      expect(screen.getByText('Test Interactive Story')).toBeInTheDocument();
    });

    it('formats view counts correctly', () => {
      const testCases = [
        { viewCount: 500, expected: '500' },
        { viewCount: 1500, expected: '1.5K' },
        { viewCount: 1500000, expected: '1.5M' }
      ];

      testCases.forEach(({ viewCount, expected }) => {
        const { unmount } = render(
          <FeedItem 
            item={{ ...mockFeedItem, viewCount }}
            onView={jest.fn()}
            onLaunch={jest.fn()}
          />
        );
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('FeedHeader', () => {
    const mockProps = {
      currentType: 'chronological' as FeedType,
      onTypeChange: jest.fn(),
      onRefresh: jest.fn(),
      isRefreshing: false,
      totalItems: 25
    };

    it('renders header with correct feed type', () => {
      render(<FeedHeader {...mockProps} />);

      expect(screen.getByText('Discover')).toBeInTheDocument();
      expect(screen.getByText('Latest')).toBeInTheDocument();
      expect(screen.getByText('25 stories')).toBeInTheDocument();
    });

    it('shows refresh button', () => {
      render(<FeedHeader {...mockProps} />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('shows create story button', () => {
      render(<FeedHeader {...mockProps} />);

      expect(screen.getByText('Create Story')).toBeInTheDocument();
    });

    it('handles refreshing state', () => {
      render(<FeedHeader {...mockProps} isRefreshing={true} />);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });
});