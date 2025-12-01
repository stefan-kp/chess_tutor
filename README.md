# AI Chess Tutor

## The Story
I always wanted to implement an AI-based chess tutor because I like playing chess, although to be honest, I actually suck at it. I didn't find the existing tutors or big apps useful enough for my needs, so I decided to build my own approach.

This application was built using **Antigravity by Google**. I like to work with it, though sometimes it just runs away. Still, I found the end result to be quite fun to play, which is why I'm sharing it here.

## How It Works

**AI Chess Tutor** is an interactive chess learning application where you play against an AI opponent powered by Stockfish while receiving real-time coaching feedback from a Large Language Model (LLM).

### Typical Game Flow

1. **Start or Resume**: From the homepage, either start a new game or continue an unfinished game from where you left off
2. **Choose Your Personality**: Select from 9 unique AI coaching personalities, each with their own teaching style and character
3. **Select Your Color**: Play as White, Black, or let the app choose randomly
4. **Play Chess**: Make your moves on the board while the Stockfish engine plays against you
5. **Get Real-Time Feedback**: After each move exchange, your AI tutor analyzes the position and provides personalized feedback based on:
   - Move quality and alternatives
   - Position evaluation changes
   - **Missed tactical opportunities** (pins, forks, skewers, checks, hanging pieces, material captures)
   - Opening theory (when applicable)
   - Strategic and positional considerations
6. **Chat with Your Tutor**: Ask questions anytime using the integrated chat feature - your tutor will answer in character
7. **Export Your Game**: Download your game as PGN or export the current position as FEN at any time
8. **Post-Game Analysis**: When the game ends, review a comprehensive analysis showing:
   - All your mistakes and inaccuracies
   - Missed tactical opportunities throughout the game
   - Learning opportunities and improvement suggestions

![Gameplay Screenshot](screenshots/gameplay.png)
*Screenshot placeholder: Main game interface with board, evaluation bar, and chat*

## Features

### Core Features
- **Stockfish Engine**: Powerful chess engine for move analysis and opponent play
- **Tactical Recognition**: Automatically detects missed tactical opportunities (pins, forks, skewers, checks, hanging pieces, material captures)
- **Opening Database**: Comprehensive database of chess openings with metadata and theory
- **Real-Time Evaluation**: Live position evaluation with visual evaluation bar
- **Move Analysis**: Detailed feedback on every move you make with tactical insights
- **Interactive Chat**: Ask your AI tutor questions and get personalized answers
- **Post-Game Analysis**: Review all your mistakes and missed opportunities after each game
- **Multi-Language Support**: Available in English, German, French, Italian, and Polish
- **FEN/PGN Import**: Import positions or games with automatic format detection
- **Game Export**: Download your games as PGN or export current position as FEN
- **Move History**: Visual move history table with evaluation changes and tactical annotations
- **Saved Games**: Continue unfinished games from where you left off
- **Settings Management**: Customize your experience with language preferences, API key management, and data controls

### AI Personalities

Choose from **9 distinct coaching personalities**, each offering a unique learning experience:

#### 📘 Opening Professor
*"This is a very instructive structure..."*

A calm, deeply knowledgeable educator who loves turning openings into understandable stories with history, plans, and model structures. Perfect for learning opening theory and understanding positional concepts.

#### 👨‍🏫 Professional Coach
*"Let's analyze the structure of this position"*

A strict, analytical, and straightforward chess coach focused on your improvement. Expect objective analysis, clear explanations based on chess principles, and professional teaching methods.

#### 🥃 Drunk Russian GM
*"Ach... life is pain, my boy"*

A bitter, fatalistic, but brilliant Grandmaster who has seen it all. Expect brutally honest feedback delivered with dark humor and existential commentary. This personality combines deep chess knowledge with a Dostoevsky-like atmosphere.

#### 🎧 Hype Streamer
*"BRO! THAT MOVE WAS INSANE!"*

An energetic, loud, and entertaining chess streamer who makes every game exciting. Expect dramatic reactions, Gen-Z slang, and over-the-top commentary that keeps you engaged and motivated.

#### 🧙‍♂️ Gandalf the Chess Wizard
*"A move is never late, nor is it early..."*

A wise and mystical chess wizard who speaks in riddles and metaphors. Combines chess wisdom with magical references and philosophical insights.

#### 🤖 Stockfish (Literal)
*"Evaluation: +0.7. Best continuation: Nf3, d5, c4..."*

The engine itself, speaking in pure chess notation and evaluations. No personality, just raw analysis and computer-like precision.

#### 😤 Toxic Gamer
*"Are you even trying? That's the worst move I've seen all day!"*

An abrasive, confrontational personality that roasts your mistakes mercilessly. Not for the faint of heart, but some players find the challenge motivating.

#### 🎭 Shakespearean Bard
*"To castle or not to castle, that is the question..."*

A theatrical personality that delivers chess analysis in Shakespearean verse and dramatic monologues. Makes every game feel like a stage performance.

#### 🧘 Zen Master
*"The board is empty, yet full of possibilities..."*

A calm, meditative personality that approaches chess as a spiritual practice. Focuses on mindfulness, patience, and finding harmony in the position.

### Tactical Recognition System

One of the standout features is the **automatic tactical pattern detection** that runs after every move:

**What it detects:**
- **Material Captures**: Safe captures of pieces and pawns (with recapture analysis)
- **Pins**: Pieces pinned to the king or more valuable pieces
- **Forks**: Pieces attacking multiple valuable targets simultaneously
- **Skewers**: Attacks forcing a valuable piece to move, exposing another
- **Checks**: Moves that give check to the opponent's king
- **Hanging Pieces**: Undefended pieces that could be captured

**How it works:**
1. After each move, the system compares your move to the engine's best move
2. If there's a significant evaluation difference, it analyzes what tactical opportunities were missed
3. The AI tutor receives this information and explains it in real-time in their characteristic style
4. All missed tactics are also shown in the post-game analysis

**Conservative approach:**
- The system uses multiple filters to avoid false positives
- Only reports tactics when there's a clear advantage
- Checks for piece safety (e.g., won't report a "capture" if the piece can be immediately recaptured)

This feature helps you learn tactical patterns naturally during gameplay, rather than just through puzzle training.

### User Experience Features

**Game Management:**
- **Save & Resume**: Your games are automatically saved to browser storage - continue playing anytime
- **Game Export**: Download your completed or in-progress games as PGN files for analysis in other tools
- **Position Export**: Export the current board position as FEN for sharing or further study
- **Game History**: Visual table showing all moves with evaluation changes and missed tactics
- **Clear All Data**: Reset your local storage from the settings page when needed

**Customization:**
- **5 Languages**: Full interface translation in English, German, French, Italian, and Polish
- **9 AI Personalities**: Choose the coaching style that motivates you best
- **Flexible Setup**: Play as White, Black, or random color selection
- **Import Games**: Start from any position using FEN or continue from a PGN game

**Analysis Tools:**
- **Real-Time Evaluation Bar**: Visual representation of position evaluation during play
- **Opening Explorer**: Automatic opening detection with theory and explanations
- **Position Analysis**: Deep-dive into any position with the analysis modal
- **Post-Game Review**: Comprehensive analysis of all mistakes and missed opportunities

**Modern Interface:**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark Mode Support**: Automatic dark/light theme based on system preferences
- **Intuitive Controls**: Drag-and-drop piece movement with visual feedback
- **Clean Layout**: Focused design that keeps the board and feedback front and center

## Quick Start

### Option 1: Docker Compose (Recommended - Easiest!)

The fastest way to get started is using our pre-built Docker image from GitHub Container Registry:

```bash
# Clone the repository
git clone https://github.com/stefan-kp/chess_tutor.git
cd chess_tutor

# (Optional) Create .env file with your API key
echo "NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here" > .env

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at `http://localhost:3050`

**What happens:**
- Docker Compose automatically pulls the latest pre-built image from `ghcr.io/stefan-kp/chess-tutor:latest`
- No build step required - the image is built automatically on every push to main via GitHub Actions
- The container starts with health checks and auto-restart enabled

### Option 2: Local Development

If you want to run the application locally for development:

#### Prerequisites
- Node.js 18+ installed
- A free Google Gemini API key

#### Steps

```bash
# Clone the repository
git clone https://github.com/stefan-kp/chess_tutor.git
cd chess_tutor

# Install dependencies
npm install

# Create .env file (optional)
echo "NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here" > .env

# Run development server
npm run dev

# Or build and run production
npm run build
npm start
```

The application will be available at `http://localhost:3050`

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### API Key Configuration

You have two options for providing your Gemini API key:

#### Option 1: Environment Variable (Recommended for Docker/Server)
1. Create a `.env` file in the project root
2. Add your API key:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
3. The application will automatically use this key

#### Option 2: Browser Storage (Fallback)
1. Run the application without an API key
2. When prompted, enter your API key in the modal dialog
3. The key will be stored in your browser's localStorage

> [!NOTE]
> You can update your API key anytime by clicking the key icon in the bottom-right corner of the application.

## Advanced Deployment

### Automated Docker Builds

This project uses GitHub Actions to automatically build and publish Docker images to GitHub Container Registry (GHCR) on every push to the `main` branch.

**What this means:**
- Every commit to `main` triggers an automatic Docker build
- The latest image is always available at `ghcr.io/stefan-kp/chess-tutor:latest`
- Each build is also tagged with the commit SHA for version tracking
- No need to build locally - just pull and run!

### Using Pre-Built Images

The `docker-compose.yml` file is already configured to use the pre-built image:

```yaml
services:
  chess-tutor:
    image: ghcr.io/stefan-kp/chess-tutor:latest
    # ... rest of configuration
```

This means you can deploy anywhere with just:
```bash
docker-compose up -d
```

### Manual Docker Build (Optional)

If you prefer to build the image yourself:

```bash
# Build the image
docker build -t chess-tutor:latest .

# Run the container
docker run -d \
  --name chess-tutor \
  -p 3050:3050 \
  -e NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here \
  --restart unless-stopped \
  chess-tutor:latest
```

### Nginx Reverse Proxy

For production deployment behind nginx, use the provided `nginx.conf.example`:

```bash
# Copy the example configuration
sudo cp nginx.conf.example /etc/nginx/sites-available/chess-tutor

# Edit the configuration
sudo nano /etc/nginx/sites-available/chess-tutor
# Update: server_name, SSL certificates (if using HTTPS)

# Enable the site
sudo ln -s /etc/nginx/sites-available/chess-tutor /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Configuration

You can configure the application using environment variables in your `.env` file or Docker Compose configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Google Gemini API Key for AI features | (Required for AI) |
| `NEXT_PUBLIC_DEBUG` | Enable debug mode to see all LLM prompts and responses | `false` |
| `IMPRINT_URL` | External URL for the Imprint link in the footer. If not set, an internal page is used. | Internal Page |
| `DATA_PRIVACY_RESPONSIBLE_PERSON` | Name of the person responsible for data privacy (shown on /privacy page). | Placeholder |

### Debug Mode

Debug mode is a powerful feature that helps you understand and troubleshoot how the AI tutor works by showing you all the prompts sent to the LLM and the responses received.

**To enable debug mode:**

1. Add to your `.env` file:
   ```
   NEXT_PUBLIC_DEBUG=true
   ```

2. Restart the application (or rebuild if using Docker)

**What debug mode shows:**

- **All LLM Prompts**: See exactly what context, instructions, and data are sent to the AI
- **All LLM Responses**: View the raw responses before they're displayed in the chat
- **Timestamps**: Track when each interaction occurred
- **Interaction Types**: Distinguish between move analysis, user questions, and other triggers

**How to use it:**

- **Floating Panel**: A debug panel appears in the bottom-right corner showing all interactions
- **Copy to Clipboard**: Click the copy button to save prompts/responses for analysis
- **Clear History**: Clear the debug log when needed
- **Expandable Details**: Click on any entry to see the full prompt and response

**Why it's useful:**

- **Troubleshooting**: Identify issues with AI responses or unexpected behavior
- **Learning**: Understand how the system constructs prompts and provides context
- **Bug Reports**: Include debug output when reporting issues
- **Customization**: See what data is available if you want to modify the prompts

**Example use cases:**

1. **Verify Position Context**: Check that the correct FEN positions are being sent
2. **Check Evaluation Data**: Ensure mate scores and centipawn values are correct
3. **Opening Detection**: See which openings are being identified and sent to the AI
4. **Tactical Analysis**: View the tactical opportunities detected by the system

> [!WARNING]
> Debug mode is intended for development and troubleshooting. It may impact performance and should not be used in production environments.

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3) - see the [LICENSE](LICENSE) file for details.

This application uses [Stockfish](https://stockfishchess.org/), which is licensed under the GPLv3.

## Credits
- Opening collection originally by [ragizaki/ChessOpeningsRecommender](https://github.com/ragizaki/ChessOpeningsRecommender)
- Chess engine: [Stockfish](https://stockfishchess.org/) (GPLv3)
- LLM: [Google Gemini](https://ai.google.dev/)

