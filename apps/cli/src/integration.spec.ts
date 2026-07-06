import { describe, it, expect } from 'vitest';
import { validateStack, FRONTEND_OPTIONS } from '@structify/core';

describe('CLI Integration Imports Sanity', () => {
  it('should successfully import validators and evaluate options', () => {
    const result = validateStack({
      projectName: 'integration-check',
      version: '1.0',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
      },
    });

    expect(result.valid).toBe(true);
    expect(FRONTEND_OPTIONS.length).toBeGreaterThan(0);
  });
});
