// Setup global do vitest.
// - jest-dom matchers (só usados em specs jsdom).
// - cleanup() após cada teste — evita leak entre renders na mesma suite.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
