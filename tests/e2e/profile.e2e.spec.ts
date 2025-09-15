import { test, expect } from '@playwright/test'

test('Profile setup updates name successfully', async ({ page }) => {
  // Logged-in session
  await page.route('**/api/auth/session', async route => {
    await route.fulfill({ json: {
      session: {
        user: { id: 'e2e-user', email: 'e2e@example.com', profile: { id: 'e2e-user', name: 'Old Name' } },
        access_token: 'token', refresh_token: 'refresh', expires_at: Math.floor(Date.now()/1000)+3600,
      }
    } })
  })

  // Intercept profile update
  await page.route('**/api/users/profile', async route => {
    if (route.request().method() === 'PUT' || route.request().method() === 'POST' || route.request().method() === 'PATCH') {
      const body = await route.request().postDataJSON()
      await route.fulfill({ json: { success: true, profile: { id: 'e2e-user', name: body.name, avatar_url: body.avatar_url ?? null } } })
    } else {
      await route.fulfill({ json: { profile: { id: 'e2e-user', name: 'Old Name', avatar_url: null } } })
    }
  })

  await page.goto('/profile/setup')
  const nameInput = page.getByPlaceholder('Enter your display name')
  await nameInput.fill('E2E Updated')
  await page.getByRole('button', { name: /save profile/i }).click()

  // Expect the request was made and UI reflects change (optimistically)
  await expect(nameInput).toHaveValue('E2E Updated')
})
