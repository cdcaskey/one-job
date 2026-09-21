import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// testing-library's own auto-cleanup only self-registers when it finds
// afterEach on globalThis; this project imports afterEach per-file
// rather than enabling vitest's `test.globals`, so it never fires
// without this explicit call — components from a previous test were
// staying mounted and leaking into the next one's queries.
afterEach(() => cleanup());

// Mantine components probe these DOM APIs on mount; jsdom doesn't
// implement them, so component tests hang or throw without stubs.
// (server-side tests run in the 'node' environment, no window here.)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  window.ResizeObserver =
    window.ResizeObserver ??
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

  Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
}
