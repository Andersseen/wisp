import { expect, test } from '@playwright/test'

test.describe('Deploy', () => {
  test('should show service list', async ({ page }) => {
    await page.goto('/deploy')
    await expect(page.locator('h1')).toHaveText('Services')
  })
})
