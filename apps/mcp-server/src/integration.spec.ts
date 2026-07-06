import { describe, it, expect } from 'vitest';
import { validateStack, PACKAGE_MANAGERS } from '@structify/core';

describe('MCP Server Integration Imports Sanity', () => {
  it('should successfully import validators and evaluate package managers', () => {
    const result = validateStack({
      projectName: 'mcp-integration-check',
      version: '1.0',
      stack: {
        frontend: 'next',
        backend: 'none',
        styling: 'tailwind',
      },
    });

    expect(result.valid).toBe(true);
    expect(PACKAGE_MANAGERS.length).toBeGreaterThan(0);
  });
});
