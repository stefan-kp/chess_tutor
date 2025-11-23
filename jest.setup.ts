import '@testing-library/jest-dom'

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();
