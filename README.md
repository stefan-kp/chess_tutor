# AI Chess Tutor

## The Story
I always wanted to implement an AI-based chess tutor because I like playing chess, although to be honest, I actually suck at it. I didn't find the existing tutors or big apps useful enough for my needs, so I decided to build my own approach.

This application was built using **Antigravity by Google**. I like to work with it, though sometimes it just runs away. Still, I found the end result to be quite fun to play, which is why I'm sharing it here.

## How It Works

**AI Chess Tutor** is an interactive chess learning application where you play against an AI opponent powered by Stockfish while receiving real-time coaching feedback from a Large Language Model (LLM).

### Typical Game Flow

1. **Choose Your Personality**: Select from three unique AI coaching personalities, each with their own teaching style and character
2. **Play Chess**: Make your moves on the board while the Stockfish engine plays against you
3. **Get Real-Time Feedback**: After each move exchange, your AI tutor analyzes the position and provides personalized feedback based on:
   - Move quality and alternatives
   - Position evaluation changes
   - Opening theory (when applicable)
   - Tactical and strategic considerations
4. **Chat with Your Tutor**: Ask questions anytime using the integrated chat feature - your tutor will answer in character
5. **Post-Game Analysis**: When the game ends, review a comprehensive analysis showing your mistakes and learning opportunities

![Gameplay Screenshot](screenshots/gameplay.png)
*Screenshot placeholder: Main game interface with board, evaluation bar, and chat*

## Features

### Core Features
- **Stockfish Engine**: Powerful chess engine for move analysis and opponent play
- **Opening Database**: Comprehensive database of chess openings with metadata and theory
- **Real-Time Evaluation**: Live position evaluation with visual evaluation bar
- **Move Analysis**: Detailed feedback on every move you make
- **Interactive Chat**: Ask your AI tutor questions and get personalized answers
- **Post-Game Analysis**: Review all your mistakes and missed opportunities after each game
- **Multi-Language Support**: Available in English, German, French, and Italian

### AI Personalities

Choose from three distinct coaching personalities, each offering a unique learning experience:

#### 🥃 Drunk Russian GM
*"Ach... life is pain, my boy"*

A bitter, fatalistic, but brilliant Grandmaster who has seen it all. Expect brutally honest feedback delivered with dark humor and existential commentary. This personality combines deep chess knowledge with a Dostoevsky-like atmosphere.

![Drunk Russian GM Screenshot](screenshots/personality-russian-gm.png)
*Screenshot placeholder: Game with Drunk Russian GM personality*

#### 🎧 Hype Streamer
*"BRO! THAT MOVE WAS INSANE!"*

An energetic, loud, and entertaining chess streamer who makes every game exciting. Expect dramatic reactions, Gen-Z slang, and over-the-top commentary that keeps you engaged and motivated.

![Hype Streamer Screenshot](screenshots/personality-hype-streamer.png)
*Screenshot placeholder: Game with Hype Streamer personality*

#### 👨‍🏫 Professional Coach
*"Let's analyze the structure of this position"*

A strict, analytical, and straightforward chess coach focused on your improvement. Expect objective analysis, clear explanations based on chess principles, and professional teaching methods.

![Professional Coach Screenshot](screenshots/personality-professional-coach.png)
*Screenshot placeholder: Game with Professional Coach personality*

## Setup

### Prerequisites
- Node.js 18+ installed
- A free Google Gemini API key

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### API Key Configuration

You have two options for providing your Gemini API key:

#### Option 1: Browser Storage (Recommended for trying it out)
1. Run the application
2. When prompted, enter your API key in the modal dialog
3. The key will be stored in your browser's localStorage

![API Key Input Screenshot](screenshots/api-key-input.png)
*Screenshot placeholder: API key input modal*

#### Option 2: Environment Variable (Recommended for local development)
1. Create a `.env` file in the project root
2. Add your API key:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
3. The application will automatically use this key

> [!NOTE]
> You can update your API key anytime by clicking the key icon in the bottom-right corner of the application.

## Credits
- Opening collection originally by [ragizaki/ChessOpeningsRecommender](https://github.com/ragizaki/ChessOpeningsRecommender)
- Chess engine: [Stockfish](https://stockfishchess.org/)
- LLM: [Google Gemini](https://ai.google.dev/)


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3050) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

