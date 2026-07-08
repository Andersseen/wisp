import { expect, test } from '@playwright/test'

test.describe('Auth', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('volt-card-title')).toHaveText('Welcome back')
  })

  test('should show register page', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.locator('volt-card-title')).toHaveText('Create your account')
  })

  test('should redirect unauthenticated users from deploy to login', async ({ page }) => {
    await page.goto('/deploy')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('should persist session after reload', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input#login-email', 'demo@wisp.sh')
    await page.fill('input#login-password', 'demo1234')
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/deploy', { timeout: 10000 })
    await expect(page.locator('h1')).toHaveText('Services')

    await page.reload()

    await expect(page).toHaveURL('/deploy')
    await expect(page.locator('h1')).toHaveText('Services')
    await expect(page.locator('[data-testid="user-email"]')).toHaveText('demo@wisp.sh')
  })
})
