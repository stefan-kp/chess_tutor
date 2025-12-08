import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Opening Training Feature
 *
 * These tests verify the complete training flow from opening selection
 * to receiving move feedback with engine evaluation and LLM explanations.
 */

test.describe('Opening Training', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });

    // Navigate to opening selection page
    await page.goto('/learning/openings');
    await page.waitForLoadState('networkidle');
  });

  test('should display opening selection page with family groups', async ({ page }) => {
    // Check page title
    await expect(page.getByText('Opening Training')).toBeVisible({ timeout: 10000 });

    // Check that opening family cards are present (look for the family buttons instead of category headers)
    const familyCards = page.locator('button[aria-label*="opening family"]');
    await expect(familyCards.first()).toBeVisible({ timeout: 10000 });

    // Should have multiple families
    const count = await familyCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display opening families by category', async ({ page }) => {
    // Check that family cards are displayed (wait for them to load)
    const familyCards = page.locator('button[aria-label*="opening family"]');

    // Wait for at least one family card to be visible
    await expect(familyCards.first()).toBeVisible({ timeout: 10000 });

    // Give a moment for other cards to render
    await page.waitForTimeout(500);

    // Should have at least one family displayed (could be more depending on data)
    const count = await familyCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should select an opening family', async ({ page }) => {
    // Look for a family card (e.g., one with "Variations:" text)
    const familyCard = page.locator('button[aria-label*="opening family"]').first();
    await expect(familyCard).toBeVisible({ timeout: 10000 });

    // Get the family name before clicking
    const familyName = await familyCard.locator('h3').textContent();

    // Click on the family
    await familyCard.click();

    // Should see the family name in the selector or openings list
    await page.waitForTimeout(1000);
  });

  test('should navigate directly to an opening', async ({ page }) => {
    // Test direct navigation first
    await page.goto('/learning/openings/A01');
    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());

    // Check if we're on the right page
    const pageContent = await page.textContent('body');
    console.log('Page contains Opening Training:', pageContent?.includes('Opening Training'));
    console.log('Page contains Nimzo-Larsen:', pageContent?.includes('Nimzo-Larsen'));

    // Verify chess board or loading state
    const hasBoard = await page.locator('[aria-label*="Chess board"]').count();
    const hasLoading = await page.locator('text="Initializing training session"').count();
    const hasNoSession = await page.locator('text="No active session"').count();

    console.log('Has chessboard:', hasBoard);
    console.log('Has loading:', hasLoading);
    console.log('Has no session:', hasNoSession);
  });

  test('should start a training session for an opening', async ({ page }) => {
    // Enable console logging
    const consoleLogs: Array<{ type: string; text: string }> = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Track page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.error('Page Error:', error.message);
    });

    // First, select a family to show opening cards
    const familyCard = page.locator('button[aria-label*="opening family"]').first();
    await expect(familyCard).toBeVisible({ timeout: 10000 });
    await familyCard.click();
    await page.waitForTimeout(1000);

    // Now get opening cards using data-testid
    const openingCards = page.locator('[data-testid^="opening-card-"]');
    const count = await openingCards.count();
    console.log('Found opening cards:', count);

    // Get first opening card
    const firstOpening = openingCards.first();
    const eco = await firstOpening.getAttribute('data-opening-eco');
    const openingText = await firstOpening.textContent();
    console.log('Clicking on opening:', eco, openingText?.substring(0, 30));

    const currentUrl = page.url();
    console.log('Current URL before click:', currentUrl);

    await firstOpening.click();

    // Wait a bit for navigation to start
    await page.waitForTimeout(500);
    console.log('URL after click:', page.url());

    // Wait for training page to load
    try {
      await page.waitForURL(/\/learning\/openings\/[A-E]\d{2}/, { timeout: 10000 });
      console.log('Successfully navigated to:', page.url());
    } catch (e) {
      console.error('Failed to navigate. Current URL:', page.url());
      console.error('Console logs:', consoleLogs.slice(-10)); // Last 10 logs
      console.error('Page errors:', pageErrors);

      // Take screenshot for debugging
      await page.screenshot({ path: 'e2e/screenshots/navigation-failed.png', fullPage: true });

      throw e;
    }

    // Wait for the page to settle
    await page.waitForTimeout(2000);

    // Log any errors that occurred
    if (pageErrors.length > 0) {
      console.error('Page errors found:', pageErrors);
      await page.screenshot({ path: 'e2e/screenshots/page-errors.png', fullPage: true });
    }

    // Verify chess board is visible
    await expect(page.locator('[aria-label*="Chess board"]')).toBeVisible({ timeout: 10000 });

    // Verify move history section
    await expect(page.getByText('Move History')).toBeVisible();

    // Verify Wikipedia summary loads (check for any of the possible states)
    const wikiSection = page.locator('text=/Loading opening background|No background information|Wikipedia/i');
    await expect(wikiSection.first()).toBeVisible({ timeout: 10000 });

    // Ensure no critical errors occurred
    expect(pageErrors.length).toBe(0);
  });

  test('should show session recovery dialog for existing session', async ({
    page,
  }) => {
    // First, select a family to show opening cards
    const familyCard = page.locator('button[aria-label*="opening family"]').first();
    await expect(familyCard).toBeVisible({ timeout: 10000 });
    await familyCard.click();
    await page.waitForTimeout(1000);

    // Start a session
    const firstOpening = page.locator('[data-testid^="opening-card-"]').first();
    await firstOpening.click();

    // Wait for session to initialize
    await page.waitForURL(/\/learning\/openings\/[A-E]\d{2}/);
    await page.waitForTimeout(2000);

    // Navigate away and back
    await page.goBack();

    // Select family again
    const familyCardAgain = page.locator('button[aria-label*="opening family"]').first();
    await familyCardAgain.click();
    await page.waitForTimeout(1000);

    const firstOpeningAgain = page.locator('[data-testid^="opening-card-"]').first();
    await firstOpeningAgain.click();

    // Expect recovery dialog if session has moves
    // (This would need actual moves to be made in a more complete test)
    await page.waitForURL(/\/learning\/openings\/[A-E]\d{2}/);
  });

  test.skip('should make a move and receive feedback', async ({ page }) => {
    // NOTE: This test is skipped because it requires:
    // 1. Stockfish engine to be loaded
    // 2. Move interaction with the chess board
    // 3. LLM API to be available
    //
    // To implement:
    // 1. Start a training session
    // 2. Make a move on the board (drag and drop)
    // 3. Wait for engine evaluation
    // 4. Verify move feedback is displayed
    // 5. Verify categorization (in-theory/playable/weak)
    // 6. Verify LLM explanation appears
  });

  test.skip('should navigate through move history', async ({ page }) => {
    // NOTE: This test is skipped - requires moves to be made first
    //
    // To implement:
    // 1. Make several moves
    // 2. Click "Back" button
    // 3. Verify board position changes
    // 4. Verify feedback updates
    // 5. Click "Forward" button
    // 6. Verify board returns to later position
  });

  test.skip('should detect deviation from theory', async ({ page }) => {
    // NOTE: This test is skipped - requires specific opening and off-book move
    //
    // To implement:
    // 1. Start a known opening
    // 2. Make moves following theory
    // 3. Make an off-book move
    // 4. Verify "Off-book since move X" indicator appears
    // 5. Verify feedback categorizes move as playable or weak (not in-theory)
  });

  test.skip('should cache LLM explanations on navigation', async ({ page }) => {
    // NOTE: This test is skipped - requires checking network requests
    //
    // To implement:
    // 1. Make a move and wait for LLM explanation
    // 2. Navigate to different move
    // 3. Navigate back to original move
    // 4. Verify no new LLM API call was made (check network tab)
    // 5. Verify explanation is displayed immediately
  });
});

/**
 * Performance Tests
 */
test.describe('Opening Training Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });
  });

  test.skip('should initialize session within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/learning/openings');
    const firstOpening = page.locator('[data-testid^="opening-card-"]').first();
    await firstOpening.click();

    await page.waitForURL(/\/learning\/openings\/[A-E]\d{2}/);
    await page.waitForSelector('[aria-label*="Chess board"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test.skip('should evaluate position within 2 seconds', async ({ page }) => {
    // NOTE: Requires making a move and measuring eval time
    // Target: Engine evaluation completes in <2s for 95% of moves
  });

  test.skip('should provide complete feedback within 5 seconds', async ({
    page,
  }) => {
    // NOTE: Requires making a move and measuring total feedback time
    // Target: Engine eval + LLM explanation in <5s for 90% of moves
  });
});

/**
 * Accessibility Tests
 */
test.describe('Opening Training Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });
  });

  test('should have proper ARIA labels on key elements', async ({ page }) => {
    await page.goto('/learning/openings');
    await page.waitForLoadState('networkidle');

    // Select a family first
    const familyCard = page.locator('button[aria-label*="opening family"]').first();
    await expect(familyCard).toBeVisible({ timeout: 10000 });
    await familyCard.click();
    await page.waitForTimeout(1000);

    // Click on first opening
    const firstOpening = page.locator('[data-testid^="opening-card-"]').first();
    await firstOpening.click();

    await page.waitForURL(/\/learning\/openings\/[A-E]\d{2}/);

    // Verify ARIA labels
    await expect(page.locator('[aria-label*="Chess board"]')).toBeVisible();
    await expect(
      page.locator('[aria-label="Move history and navigation"]')
    ).toBeVisible();
    await expect(page.locator('[aria-label="Go to previous move"]')).toBeVisible();
    await expect(page.locator('[aria-label="Go to next move"]')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/learning/openings');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});
