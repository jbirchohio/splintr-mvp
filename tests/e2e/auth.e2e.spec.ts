import { test, expect } from '@playwright/test'

test.describe('Authentication Journeys', () => {
  test('dashboard is accessible for authenticated E2E user', async ({ page }) => {
    // E2E environment provides an authenticated user via app code
    await page.goto('/dashboard')
    await expect(page.getByText('Create New Story')).toBeVisible()
  })
})
