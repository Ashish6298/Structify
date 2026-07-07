import { describe, it, expect } from 'vitest';
import { TemplateVariableEngine } from './engine.js';

describe('Template Variable Engine', () => {
  const engine = new TemplateVariableEngine();

  it('should interpolate template content successfully', () => {
    const template = 'Hello {{ projectName }}! Using {{ packageManager }}.';
    const result = engine.interpolate(template, {
      projectName: 'my-app',
      packageManager: 'npm',
    });
    expect(result).toBe('Hello my-app! Using npm.');
  });

  it('should throw error for missing variables', () => {
    const template = 'Hello {{ name }}!';
    expect(() => {
      engine.interpolate(template, {});
    }).toThrow('Missing template variable: "name"');
  });

  it('should prevent path traversal inside variables', () => {
    const template = 'Path: {{ configPath }}';
    expect(() => {
      engine.interpolate(template, {
        configPath: '../../etc/passwd',
      });
    }).toThrow('Unsafe path traversal detected');
  });
});
