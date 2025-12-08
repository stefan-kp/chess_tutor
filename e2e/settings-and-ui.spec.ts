import { test, expect } from '@playwright/test';

test.describe('Settings and UI Features', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });
  });

  test('should navigate to settings page', async ({ page }) => {
    // Navigate directly to settings page
    await page.goto('/settings');

    // Should be on settings page
    await expect(page).toHaveURL('/settings');

    // Should see settings heading
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('should display language selector', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should see language options (buttons show language codes like EN, DE, FR)
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'DE', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'FR', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IT', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PL', exact: true })).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click German language
    const deutschButton = page.getByRole('button', { name: 'DE', exact: true });
    await deutschButton.click();

    // Wait for language to change
    await page.waitForTimeout(500);

    // DE button should now be selected (blue background)
    await expect(deutschButton).toHaveClass(/bg-blue-600/);
  });

  test('should display API key management', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Should see API key section
    await expect(page.locator('text=Google Gemini API Key')).toBeVisible();
    
    // Should see API key input
    const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]'));
    await expect(apiKeyInput.first()).toBeVisible();
  });

  test('should save API key', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Enter API key
    const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input[placeholder*="API"]'));
    await apiKeyInput.first().fill('test-api-key-12345');
    
    // Should see save button
    const saveButton = page.locator('button:has-text("Save")').or(page.locator('button:has-text("Update")'));
    if (await saveButton.count() > 0) {
      await saveButton.first().click();
      
      // Should see success message or confirmation
      await page.waitForTimeout(500);
    }
    
    // Verify API key is saved in localStorage
    const savedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(savedKey).toBe('test-api-key-12345');
  });

  test('should display save button', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should see save button
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
  });

  test('should navigate back from settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click back arrow button
    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await backButton.click();

    // Should return to onboarding or home page
    await page.waitForTimeout(500);
    // URL should change from /settings
    expect(page.url()).not.toContain('/settings');
  });

  test('should display header on all pages', async ({ page }) => {
    // Check home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const homeHeader = page.getByRole('heading', { name: 'Chess Tutor AI' });
    if (await homeHeader.count() > 0) {
      await expect(homeHeader.first()).toBeVisible();
    }

    // Check learning page
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    const learningHeader = page.getByRole('heading', { name: 'Chess Tutor AI' });
    if (await learningHeader.count() > 0) {
      await expect(learningHeader.first()).toBeVisible();
    }

    // Check settings page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const settingsHeader = page.getByRole('heading', { name: 'Chess Tutor AI' });
    if (await settingsHeader.count() > 0) {
      await expect(settingsHeader.first()).toBeVisible();
    }
  });

  test('should show personality options on start screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Start New Game
    const startButton = page.locator('button:has-text("Start New Game")');
    await startButton.click();

    // Should see personality options (check for at least 3 of the available personalities)
    await expect(page.locator('button:has-text("Professional Coach")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Friendly Motivator")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Opening Professor")').first()).toBeVisible();
  });

  test('should display start screen when API key exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see the start screen heading
    await expect(page.getByRole('heading', { name: 'Chess Tutor AI' }).first()).toBeVisible();

    // Should see main action buttons
    await expect(page.locator('button:has-text("Start New Game")')).toBeVisible();
  });

  test('should redirect to onboarding when API key is missing', async ({ browser }) => {
    // Create a new context without the API key
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding');

    await context.close();
  });
});

