import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Feed } from '@/components/feed/Feed';

// Mock the useFeed hook
jest.mock('@/hooks/useFeed', () => ({
  useFeed: () => ({
    items: [
      {
        storyId: 'story-1',
        creatorId: 'creator-1',
        creatorName: 'Test Creator',
        title: 'Test Story',
        description: 'Test Description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        viewCount: 100,
        publishedAt: '2024-01-01T00:00:00Z'
      }
    ],
    loading: false,
    error: null,
    hasMore: true,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    incrementViews: jest.fn()
  })
}));

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

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

describe('Feed Integration', () => {
  it('renders feed with stories', async () => {
    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('Discover')).toBeInTheDocument();
      expect(screen.getByText('Test Story')).toBeInTheDocument();
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
    });
  });

  it('shows feed header controls', async () => {
    render(<Feed />);

    await waitFor(() => {
      expect(screen.getByText('Latest')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Create Story')).toBeInTheDocument();
    });
  });
});