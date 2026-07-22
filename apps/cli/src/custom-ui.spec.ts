import { describe, expect, it } from 'vitest';
import { moveSelection } from './utils/prompts.js';
import { renderWizardSelectionPanel, stripAnsi } from './utils/ui.js';

describe('custom init wizard presentation', () => {
  it('keeps the shared panel complete and ANSI-safe at supported widths', () => {
    const originalColumns = process.stdout.columns;
    for (const width of [80, 100, 120, 150]) {
      Object.defineProperty(process.stdout, 'columns', { value: width, configurable: true });
      const lines = renderWizardSelectionPanel(
        'Select Frontend Framework',
        3,
        10,
        0,
        [
          {
            label: 'Next.js',
            description: 'Select the frontend framework to include in this project.',
          },
          {
            label: 'React (Vite)',
            description: 'Select the frontend framework to include in this project.',
          },
        ],
        [{ label: 'Project', value: 'a-project-with-a-long-name' }],
        false,
      );
      const panel = lines.map(stripAnsi).filter((line) => /^\u250c|^\u2502|^\u2514/.test(line));
      expect(panel.length).toBeGreaterThan(0);
      panel.forEach((line) => expect(line.length).toBe(Math.min(width, 80)));
      expect(panel[0]).toMatch(/^\u250c/);
      expect(panel.at(-1)).toMatch(/\u2518$/);
    }
    Object.defineProperty(process.stdout, 'columns', {
      value: originalColumns,
      configurable: true,
    });
  });

  it('keeps selection navigation stable through repeated back-and-forward cycles', () => {
    let index = 0;
    for (let cycle = 0; cycle < 20; cycle++) {
      index = moveSelection(index, 'down', 3);
      index = moveSelection(index, 'up', 3);
      expect(index).toBe(0);
    }
  });
});
