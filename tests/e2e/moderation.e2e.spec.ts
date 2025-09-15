import { test, expect } from '@playwright/test'

test.describe('Content Moderation & Flagging Workflow', () => {
  test('user flags content and admin reviews it', async ({ page }) => {
    // Mock flag creation
    await page.route('**/api/moderation/flag-content', async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = await route.request().postDataJSON()
      await route.fulfill({ json: {
        success: true,
        data: {
          id: 'flag-123',
          contentType: body.contentType,
          contentId: body.contentId,
          reporterId: 'e2e-user',
          reason: body.reason,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      } })
    })

    // Mock review action
    await page.route('**/api/moderation/review', async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = await route.request().postDataJSON()
      await route.fulfill({ json: {
        success: true,
        message: `Content ${body.decision}d successfully`
      } })
    })

    await page.goto('/moderation-demo')

    // Fill out and submit flag
    await page.getByLabel('Content ID').fill('video-789')
    await page.getByLabel('Content Type').selectOption('video')
    await page.getByLabel('Reason').fill('Inappropriate content')
    await page.getByRole('button', { name: 'Flag Content' }).click()

    await expect(page.getByLabel('status')).toContainText('Flag created: flag-123')

    // Review the flag as admin
    await page.getByLabel('Flag ID').fill('flag-123')
    await page.getByLabel('Decision').selectOption('approve')
    await page.getByRole('button', { name: 'Submit Review' }).click()

    await expect(page.getByLabel('status')).toContainText('approved successfully')
  })
})

