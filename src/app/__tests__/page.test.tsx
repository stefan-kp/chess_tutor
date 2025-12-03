
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../page';

const mockPush = jest.fn();
const mockRouter = {
    push: mockPush,
};

jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
}));

jest.mock('@/components/ChessGame', () => ({
    __esModule: true,
    default: () => <div data-testid="chess-game">Chess Game Mock</div>,
}));

jest.mock('@/components/StartScreen', () => ({
    __esModule: true,
    default: ({ onStartGame }: { onStartGame: (options: any) => void }) => (
        <div data-testid="start-screen">
            <button onClick={() => onStartGame({ personality: { name: 'Test Personality' }, color: 'white' })}>
                Start Game
            </button>
        </div>
    ),
}));

describe('Home Component', () => {
    beforeEach(() => {
        localStorage.setItem('gemini_api_key', 'test-key');
        mockPush.mockClear();
    });

    it('renders the start screen initially', () => {
        render(<Home />);
        expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    });

    it('starts the game when the start button is clicked', () => {
        render(<Home />);
        const startButton = screen.getByText('Start Game');
        fireEvent.click(startButton);
        expect(screen.getByTestId('chess-game')).toBeInTheDocument();
    });
});
