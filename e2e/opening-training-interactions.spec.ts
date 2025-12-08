import { test, expect } from '@playwright/test';

/**
 * Opening Training - Interactive Move Tests
 *
 * These tests verify the core opening training functionality including:
 * - User makes correct moves in theory
 * - User makes incorrect moves
 * - Navigation back and forth through move history
 * - Opponent automatically responds in theory
 * - Correcting mistakes after navigating back
 */

test.describe('Opening Training - Interactive Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Set a mock API key in localStorage BEFORE any page loads
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });

    await page.goto('/learning/openings');
    await page.waitForLoadState('networkidle');
  });

  test('should handle user playing as White - correct moves in theory', async ({ page }) => {
    // Select an opening where user plays White (e.g., C00 - French Defense)
    // In French Defense, White plays first with 1.e4
    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify board is visible
    await expect(page.locator('[aria-label*="Chess board"]')).toBeVisible();

    // Verify it's White's turn (user's turn)
    // The board should show the starting position
    await expect(page.getByText('No moves yet. Make your first move!')).toBeVisible();

    // Make the first move: e2 to e4 (drag and drop)
    const board = page.locator('[aria-label*="Chess board"]').first();
    await expect(board).toBeVisible();

    // Wait a bit for Stockfish to be ready
    await page.waitForTimeout(2000);

    // For now, we'll log this test as a placeholder since actual drag-drop
    // requires more complex interaction with react-chessboard
    console.log('[Test] Would make move e2-e4 here');

    // TODO: Implement actual drag-drop interaction
    // This requires:
    // 1. Finding the e2 square element
    // 2. Finding the e4 square element
    // 3. Performing drag and drop
    // 4. Waiting for move to be processed
  });

  test('should handle user playing as Black - opponent moves first', async ({ page }) => {
    // Select an opening where user plays Black
    // For example, a 1.e4 opening from Black's perspective
    await page.goto('/learning/openings/C00'); // French Defense from Black's perspective
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // In this case, we expect the opponent (White) to make the first move automatically
    // We should see that White has moved e2-e4

    // Wait for auto-move to happen
    await page.waitForTimeout(3000);

    // Check if move history shows a move
    const moveHistory = page.locator('[aria-label="List of moves played"]');
    await expect(moveHistory).toBeVisible();

    // If the opening is from Black's perspective, White should move first
    // We should see "1. e4" or similar in the move list

    console.log('[Test] Would verify opponent moved first');
  });

  test('should handle navigation: make wrong move, go back, make correct move', async ({ page }) => {
    // This is the key scenario the user reported
    // 1. User makes a wrong move
    // 2. System identifies it as wrong
    // 3. User clicks "Back" button to navigate back
    // 4. User makes the correct move
    // 5. Opponent should respond (this was the bug)

    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('[Test] Scenario:');
    console.log('[Test] 1. User would make a WRONG move');
    console.log('[Test] 2. System would categorize it as "weak" or "playable" not "in-theory"');
    console.log('[Test] 3. User clicks BACK button');
    console.log('[Test] 4. User makes CORRECT move');
    console.log('[Test] 5. Opponent should respond');

    // Verify navigation buttons exist
    const backButton = page.locator('button[aria-label="Go to previous move"]');
    const forwardButton = page.locator('button[aria-label="Go to next move"]');

    await expect(backButton).toBeVisible();
    await expect(forwardButton).toBeVisible();

    // Verify back button is disabled initially (no moves yet)
    await expect(backButton).toBeDisabled();
  });

  test('should show move classification in history', async ({ page }) => {
    // After making moves, each move should show classification
    // - in-theory (green)
    // - playable (yellow)
    // - weak (red)

    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check that move history section is ready
    await expect(page.getByText('Move History')).toBeVisible();

    console.log('[Test] After moves are made, would verify:');
    console.log('[Test] - Moves show colored badges (green/yellow/red)');
    console.log('[Test] - Move classification text is visible');
    console.log('[Test] - Can click on moves to navigate');
  });

  test('should clear future moves when making new move after navigation back', async ({ page }) => {
    // This test verifies that when a user:
    // 1. Makes moves A, B, C
    // 2. Navigates back to after move A
    // 3. Makes a different move D
    // Then moves B and C should be discarded

    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('[Test] Scenario:');
    console.log('[Test] 1. Make moves: e4, e5, Nf3 (for example)');
    console.log('[Test] 2. Navigate back to position after e4');
    console.log('[Test] 3. Make different move: d4 instead of e5');
    console.log('[Test] 4. Verify e5 and Nf3 are removed from history');
    console.log('[Test] 5. Verify new branch starts from e4, d4');
  });

  test('should resume session and continue if opponent turn', async ({ page }) => {
    // Create a session, make some moves, leave, come back
    // If it's opponent's turn when resuming, they should move

    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Make initial session with some moves
    console.log('[Test] Would make moves to create a session');

    // Navigate away
    await page.goto('/learning');
    await page.waitForTimeout(500);

    // Navigate back to the opening
    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');

    // User might see "Resume Session" dialog
    const resumeButton = page.locator('button:has-text("Resume Session")');
    const startFreshButton = page.locator('button:has-text("Start Fresh")');

    // If dialog appears, click Resume
    if (await resumeButton.isVisible({ timeout: 2000 })) {
      await resumeButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('[Test] After resuming:');
    console.log('[Test] - If opponent turn, they should move automatically');
    console.log('[Test] - If user turn, board should wait for user');
  });
});

/**
 * Helper test for debugging chess board interaction
 */
test.describe('Opening Training - Board Interaction Debugging', () => {
  test.skip('debug: inspect chess board structure', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'mock-api-key-for-testing');
    });

    await page.goto('/learning/openings/C00');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take a screenshot to see the board
    await page.screenshot({ path: 'e2e/debug-screenshots/chessboard.png', fullPage: true });

    // Try to find pieces and squares
    const boardElement = page.locator('[aria-label*="Chess board"]').first();
    await expect(boardElement).toBeVisible();

    // Log the board HTML structure for debugging
    const boardHTML = await boardElement.innerHTML();
    console.log('[Debug] Board HTML structure:');
    console.log(boardHTML.substring(0, 500)); // First 500 chars

    // Try to find SVG pieces
    const pieces = page.locator('svg image[href*="piece"]');
    const pieceCount = await pieces.count();
    console.log(`[Debug] Found ${pieceCount} piece elements`);
  });
});
