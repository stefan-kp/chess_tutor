import { test, expect } from '@playwright/test';

test.describe('Tactical Practice Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });
  });

  test('should navigate to learning area from start screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the Learning Area button to be visible
    const learningButton = page.locator('button:has-text("Learning Area")').last();
    await expect(learningButton).toBeVisible({ timeout: 10000 });

    // Click on Learning Area button
    await learningButton.click();

    // Should be on the learning page
    await expect(page).toHaveURL('/learning');

    // Should see tactical pattern buttons
    await expect(page.locator('text=PIN')).toBeVisible();
    await expect(page.locator('text=FORK')).toBeVisible();
    await expect(page.locator('text=SKEWER')).toBeVisible();
  });

  test('should select a coach before starting practice', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');

    // Should see personality selection
    await expect(page.locator('button:has-text("Professional Coach")').first()).toBeVisible();

    // Select a coach
    const professionalCoach = page.locator('button:has-text("Professional Coach")').first();
    await professionalCoach.click();

    // Coach should be selected (button should have blue border)
    await expect(professionalCoach).toHaveClass(/border-blue-500/);
  });

  test('should start PIN tactical practice', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');

    // Select a coach first
    await page.locator('button:has-text("Professional Coach")').first().click();

    // Click on PIN button
    await page.click('text=PIN');

    // Should navigate to PIN practice page
    await expect(page).toHaveURL('/learning/tactics/pin');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for puzzle to load

    // Should see the chessboard (react-chessboard uses SVG/images, not canvas)
    // Look for statistics which are always visible
    await expect(page.getByText('Correct', { exact: true })).toBeVisible({ timeout: 15000 });

    // Should see statistics display
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
    await expect(page.getByText('Current Streak', { exact: true })).toBeVisible();
    await expect(page.getByText('Best Streak', { exact: true })).toBeVisible();

    // Should see difficulty selector
    await expect(page.locator('button:has-text("Easy")')).toBeVisible();
    await expect(page.locator('button:has-text("Medium")')).toBeVisible();
    await expect(page.locator('button:has-text("Hard")')).toBeVisible();

    // Should see puzzle rating
    await expect(page.locator('text=Puzzle Rating')).toBeVisible();
  });

  test('should display skip button', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.click('text=PIN');
    await page.waitForLoadState('networkidle');

    // Should see Skip Puzzle button
    await expect(page.locator('button:has-text("Skip Puzzle")')).toBeVisible({ timeout: 10000 });
  });

  test('should switch difficulty levels', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.click('text=PIN');
    await page.waitForLoadState('networkidle');

    // Wait for initial puzzle to load
    await page.waitForSelector('text=Puzzle Rating', { timeout: 10000 });

    // Close any modals or overlays that might be blocking
    const closeButtons = page.locator('button[aria-label*="Close"]').or(page.locator('button:has-text("×")'));
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click({ force: true });
      await page.waitForTimeout(500);
    }

    // Get initial difficulty button state (Easy is selected by default with green background)
    const easyButton = page.locator('button:has-text("Easy")');
    await expect(easyButton).toHaveClass(/bg-green-500/); // Easy is green when selected

    // Click Medium difficulty - use force to bypass any overlays
    await page.locator('button:has-text("Medium")').click({ force: true });

    // Wait for new puzzle to load
    await page.waitForTimeout(1500);

    // Medium button should now be selected (yellow background)
    const mediumButton = page.locator('button:has-text("Medium")');
    await expect(mediumButton).toHaveClass(/bg-yellow-500/);
  });

  test('should show coach chat interface', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.click('text=FORK');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for puzzle to load

    // Wait for page to load (react-chessboard uses SVG/images, not canvas)
    await expect(page.getByText('Correct', { exact: true })).toBeVisible({ timeout: 15000 });

    // Close any modals or overlays that might be open
    const closeButtons = page.locator('button[aria-label*="Close"]').or(page.locator('button:has-text("×")'));
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click({ force: true });
      await page.waitForTimeout(500);
    }

    // Should see input field for asking questions
    await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible({ timeout: 10000 });

    // Should see send button (it's an icon-only button with the Send icon)
    const sendButton = page.locator('button[type="submit"]').or(page.locator('form button').last());
    await expect(sendButton.first()).toBeVisible();
  });

  test('should update statistics when skipping puzzle', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.click('text=PIN');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for puzzle to load

    // Wait for puzzle to load (react-chessboard uses SVG/images, not canvas)
    await expect(page.getByText('Correct', { exact: true })).toBeVisible({ timeout: 15000 });

    // Close any modals or overlays that might be blocking
    const closeButtons = page.locator('button[aria-label*="Close"]').or(page.locator('button:has-text("×")'));
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click({ force: true });
      await page.waitForTimeout(500);
    }

    // Find the incorrect stat card - it's the second stat card
    const statCards = page.locator('.bg-white.dark\\:bg-gray-800.rounded-lg.p-4');
    const incorrectCard = statCards.nth(1);
    const incorrectValue = incorrectCard.locator('.text-2xl.font-bold');

    // Initial stats should be 0
    await expect(incorrectValue).toHaveText('0');

    // Click Skip Puzzle - use force if needed to bypass overlays
    await page.locator('button:has-text("Skip Puzzle")').click({ force: true });

    // Wait for stats to update and new puzzle to load
    await page.waitForTimeout(1000);

    // Incorrect count should increase
    await expect(incorrectValue).toHaveText('1');
  });

  test('should navigate back to learning area', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.click('text=PIN');
    await page.waitForLoadState('networkidle');

    // Click back button
    await page.click('text=Back to Learning');

    // Should be back on learning page
    await expect(page).toHaveURL('/learning');
  });

  test('should display all 8 tactical patterns', async ({ page }) => {
    await page.goto('/learning');
    
    const patterns = [
      'PIN',
      'SKEWER',
      'FORK',
      'DISCOVERED CHECK',
      'DOUBLE ATTACK',
      'OVERLOADING',
      'BACK RANK WEAKNESS',
      'TRAPPED PIECE'
    ];
    
    for (const pattern of patterns) {
      await expect(page.locator(`text=${pattern}`)).toBeVisible();
    }
  });
});

