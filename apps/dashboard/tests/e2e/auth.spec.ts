import { expect, test } from '@playwright/test'

test.describe('Auth', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('h1')).toHaveText('Login')
  })

  test('should show register page', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('h1')).toHaveText('Register')
  })
})
