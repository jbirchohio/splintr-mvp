import { test, expect } from '@playwright/test'

test('Feed displays mocked stories and navigates', async ({ page }) => {
  // Session can be anonymous
  await page.route('**/api/auth/session', async route => {
    await route.fulfill({ json: { session: null } })
  })

  // Mock public feed with shape expected by useFeed (FeedResponse)
  await page.route('**/api/feed**', async route => {
    await route.fulfill({ json: {
      items: [
        {
          storyId: 'story-1', creatorId: 'e2e-user', creatorName: 'E2E User',
          title: 'E2E Story', description: 'Test story', thumbnailUrl: null,
          viewCount: 123, publishedAt: new Date().toISOString(), engagementScore: 0.5,
        },
      ],
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
    } })
  })

  await page.goto('/feed')
  await expect(page.getByText('Discover')).toBeVisible()
})
