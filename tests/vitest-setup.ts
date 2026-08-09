import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Automatically restore all mocks between tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Mock console methods to silence output during tests
beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
});

// Restore console methods after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
  vi.restoreAllMocks();
});

/**
 * jsdom has no `matchMedia`, and anything responsive reaches for it. Reports
 * "not narrow", which is the desktop layout — the breakpoint-specific paths
 * get their own tests that stub this per case.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

// Create a global fetch mock
beforeAll(() => {
  global.fetch = vi.fn();
});

// Restore fetch after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
