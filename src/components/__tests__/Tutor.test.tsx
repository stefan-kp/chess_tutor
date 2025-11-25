
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tutor } from '../Tutor';
import { Stockfish } from '@/lib/stockfish';
import { Chess } from 'chess.js';
import * as gemini from '@/lib/gemini';

jest.mock('@/lib/stockfish');
jest.mock('@/lib/gemini');

describe('Tutor', () => {
  let stockfish: Stockfish;
  let game: Chess;

  beforeEach(() => {
    stockfish = new Stockfish();
    game = new Chess();
    (gemini.getGenAIModel as jest.Mock).mockReturnValue({
        startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
                response: {
                    text: () => 'Test response',
                },
            }),
        }),
    });
  });

  it('should call evaluateCurrentPosition when hint button is clicked', async () => {
    const evaluateSpy = jest.spyOn(stockfish, 'evaluate').mockResolvedValue({
      bestMove: 'e2e4',
      ponder: 'e7e5',
      score: 10,
      mate: null,
      depth: 15,
    });

    render(
      <Tutor
        game={game}
        currentFen={game.fen()}
        userMove={null}
        computerMove={null}
        stockfish={stockfish}
        evalP0={null}
        evalP2={null}
        openingData={null}
        onAnalysisComplete={() => {}}
        apiKey="test-api-key"
        personality={{
            name: "Test Personality",
            systemPrompt: "Test Prompt",
            image: "🤖"
        }}
        language="en"
        playerColor="white"
      />
    );

    const hintButton = screen.getByText(/hint/i);
    await act(async () => {
      fireEvent.click(hintButton);
    });


    expect(evaluateSpy).toHaveBeenCalledWith(game.fen(), 15);
  });
});
