# Debug Mode

Debug mode allows you to inspect the exact prompts sent to the LLM and the responses received. This is useful for troubleshooting AI behavior and understanding how the tutor works.

## Enabling Debug Mode

1. Create a `.env.local` file in the root directory (if it doesn't exist)
2. Add the following line:
   ```
   NEXT_PUBLIC_DEBUG=true
   ```
3. Restart the development server (`npm run dev`)

## Using Debug Mode

When debug mode is enabled, you'll see:

### Floating Debug Panel
- A purple "Debug Mode" button appears in the bottom-right corner
- Click to expand and see all LLM interactions
- Shows a list of all prompts sent during your session
- Click any entry to see the full prompt and response

### Features
- **Copy to Clipboard**: Copy prompts or responses for analysis
- **Clear Entries**: Clear all debug entries
- **Metadata**: View additional context like FEN, personality, language, etc.
- **Timestamps**: See when each interaction occurred

### What's Tracked

**Tutor Component:**
- Move Analysis (automatic after each move)
- Best Move Requests (when user asks for the best move)
- Hint Requests (when user asks for a hint)
- General Questions (any other user question)

**Analysis Page:**
- Move Analysis for each move in the game
- Includes move number, color, FEN before/after, evaluation changes

## Disabling Debug Mode

1. Remove or comment out the `NEXT_PUBLIC_DEBUG=true` line in `.env.local`
2. Or set it to `false`: `NEXT_PUBLIC_DEBUG=false`
3. Restart the development server

## Privacy Note

Debug mode only runs locally in your browser. No debug data is sent to any server.

