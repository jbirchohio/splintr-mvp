import { test, expect } from '@playwright/test'

test('Interactive story viewing loads player', async ({ page }) => {
  // Visit an arbitrary story id; player will show loading state
  await page.goto('/story/00000000-0000-0000-0000-000000000000/play')
  await expect(page.getByText('Loading story...')).toBeVisible()
})

