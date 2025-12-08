import { test, expect } from '@playwright/test';

test.describe('Game Playing Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });

    // Mock the LLM API to avoid needing a real API key
    await page.route('**/api/v1/llm/chat', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Generate contextual responses based on the message
      let reply = "Let's play chess! Make your move.";

      if (postData.message?.includes('NEW GAME')) {
        reply = "Welcome! I'm ready to help you improve your chess. Let's begin!";
      } else if (postData.message?.includes('PLAYER MOVE')) {
        reply = "Interesting move! Let me think about my response.";
      } else if (postData.message?.includes('COMPUTER MOVE')) {
        reply = "I've made my move. What do you think about the position?";
      } else if (postData.message?.includes('GAME OVER')) {
        reply = "Good game! Let's review what we learned.";
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply }),
      });
    });
  });

  test('should start a new game as white', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see the start screen heading
    await expect(page.getByRole('heading', { name: 'Chess Tutor AI' }).first()).toBeVisible({ timeout: 10000 });

    // Click "Start New Game" button
    const startButton = page.locator('button:has-text("Start New Game")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Should see personality selection
    await expect(page.locator('button:has-text("Professional Coach")')).toBeVisible();

    // White should be selected by default
    await expect(page.locator('button:has-text("Play as White")')).toHaveClass(/border-blue-600/);

    // Click on a personality to start the game
    await page.locator('button:has-text("Professional Coach")').first().click();

    // Wait for game to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give Stockfish time to initialize

    // Should see the chessboard (react-chessboard uses SVG/images, not canvas)
    // Look for the "Undo Last Move" button which appears when the game is loaded
    await expect(page.locator('button:has-text("Undo Last Move")')).toBeVisible({ timeout: 20000 });

    // Should see evaluation bar (if present)
    const evaluationElement = page.locator('text=Evaluation').or(page.locator('[class*="evaluation"]'));
    if (await evaluationElement.count() > 0) {
      await expect(evaluationElement.first()).toBeVisible();
    }

    // Should see chat interface
    await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible();
  });

  test('should start a new game as black', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startButton = page.locator('button:has-text("Start New Game")');
    await startButton.click();

    // Select black
    await page.locator('button:has-text("Play as Black")').click();
    await expect(page.locator('button:has-text("Play as Black")')).toHaveClass(/border-blue-600/);

    // Click on a personality to start the game
    await page.locator('button:has-text("Professional Coach")').first().click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should see the chessboard (react-chessboard uses SVG/images, not canvas)
    await expect(page.locator('button:has-text("Undo Last Move")')).toBeVisible({ timeout: 20000 });

    // Board should be flipped (black at bottom)
    // The computer should make the first move since we're playing as black
    await page.waitForTimeout(2000);
  });

  test('should import a FEN position', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startButton = page.locator('button:has-text("Start New Game")');
    await startButton.click();

    // Expand advanced options
    const advancedButton = page.locator('button:has-text("Advanced")');
    await advancedButton.click();

    // Enter a FEN position (Scholar's Mate position)
    const fenInput = page.locator('textarea[placeholder*="Paste FEN"]');
    await expect(fenInput).toBeVisible();
    await fenInput.fill('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');

    // Should detect FEN format
    await expect(page.locator('text=FEN Position')).toBeVisible();

    // Click on a personality to start the game
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should load the position (react-chessboard uses SVG/images, not canvas)
    await expect(page.locator('button:has-text("Undo Last Move")')).toBeVisible({ timeout: 20000 });
  });

  test('should show game controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start a quick game
    const startButton = page.locator('button:has-text("Start New Game")');
    await startButton.click();
    await page.locator('button:has-text("Professional Coach")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Wait for game to load (react-chessboard uses SVG/images, not canvas)
    await expect(page.locator('button:has-text("Undo Last Move")')).toBeVisible({ timeout: 20000 });

    // Should see game control buttons (using more flexible selectors)
    await expect(page.locator('button').filter({ hasText: /Resign|Give up/i }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Download|Save/i }).first()).toBeVisible();
  });
});

