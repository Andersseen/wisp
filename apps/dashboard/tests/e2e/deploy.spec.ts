import { expect, test } from '@playwright/test'

test.describe('Deploy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input#login-email', 'demo@wisp.sh')
    await page.fill('input#login-password', 'demo1234')
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/deploy', { timeout: 10000 })
  })

  test('should show service list', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Services')
  })
})
