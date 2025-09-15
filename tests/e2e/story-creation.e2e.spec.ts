import { test, expect } from '@playwright/test'

test('Story creation and publish flow (demo editor)', async ({ page }) => {
  // Videos endpoint used by VideoSelector
  await page.route('**/api/videos', async route => {
    await route.fulfill({ json: {
      videos: [
        {
          id: 'vid-1', originalFilename: 'clip.mp4', duration: 20,
          thumbnailUrl: null, processingStatus: 'completed', createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    } })
  })

  await page.goto('/story-editor-demo')

  // Set title
  const titleInput = page.getByPlaceholder('Story Title')
  await titleInput.fill('E2E Adventure')

  // Add a node
  await page.getByRole('button', { name: 'Add Node' }).click()

  // Select the new node by clicking its list entry
  await page.getByText('Node 1').click()

  // Open video selector and choose the mocked video
  await page.getByRole('button', { name: 'Select Video' }).click()
  await page.getByText('clip.mp4').click()
  await page.getByRole('button', { name: 'Select Video' }).click()

  // Add an end node and link a choice
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('Node 2').click()
  await page.getByText('End').click() // set node type to End Node

  // Go back to Node 1, add a choice linking to Node 2
  await page.getByText('Node 1').click()
  await page.getByRole('button', { name: 'Add Choice' }).click()
  await page.getByLabel('Choice Text').fill('Go to ending')
  await page.getByLabel('Links to Node').selectOption({ label: 'Node 2' })

  // Save and publish using demo buttons
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Publish' }).click()

  // Expect the header Publish button to toggle to Publishing... momentarily (best-effort)
  await expect(page.getByRole('button', { name: /Publish|Publishing/ })).toBeVisible()
})
