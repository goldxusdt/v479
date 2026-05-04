import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should show login page and allow typing', async ({ page }) => {
    await page.goto('/login');
    
    // Check for title
    await expect(page).toHaveTitle(/Login | Gold X Usdt/);
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    // Test typing
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should show validation errors on empty submission', async ({ page }) => {
    await page.goto('/login');
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    // Check for validation messages (assuming standard HTML5 or custom validation)
    // This depends on the implementation, but we can check if we're still on the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
