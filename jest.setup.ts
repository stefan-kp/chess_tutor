import '@testing-library/jest-dom'

if (typeof window !== 'undefined') {
  // Mock scrollIntoView for JSDOM
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
}

// Mock react-markdown to avoid ESM issues in Jest
jest.mock('react-markdown', () => ({
    __esModule: true,
    default: (props: any) => props.children,
}));
