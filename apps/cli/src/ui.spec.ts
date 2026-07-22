import { describe, it, expect } from 'vitest';
import {
  renderSetupPanel,
  renderProjectNamePanel,
  renderCategoryPanel,
  renderTemplatePanel,
  renderStylingPanel,
  renderReviewPanel,
  renderReadyToGeneratePanel,
  renderGenerationPanel,
  renderProjectOverviewPanel,
  renderGeneratedFeaturesPanel,
  renderNextStepsPanel,
  renderQuickTipsPanel,
  stripAnsi,
} from './utils/ui.js';

describe('UI Panel Alignment Tests', () => {
  it('should ensure all rows in renderSetupPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderSetupPanel(0, false, false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderProjectNamePanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderProjectNamePanel('my-project', 'predefined', false, 'my-structify-app');
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderCategoryPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderCategoryPanel(0, 'my-project', false, false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderTemplatePanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderTemplatePanel(0, 'my-project', 'frontend', false, false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderStylingPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderStylingPanel(
          0,
          'my-project',
          'frontend',
          'Portfolio Website',
          false,
          false,
        );
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderReviewPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderReviewPanel(
          'my-project',
          'D:\\Workspace\\my-project',
          'Predefined Template',
          'Frontend',
          'Portfolio Website',
          'Tailwind CSS',
          true,
          ['A', 'B'],
          false,
        );
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderReadyToGeneratePanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderReadyToGeneratePanel(0, false, false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderGenerationPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderGenerationPanel(
          'my-project',
          'Portfolio Website',
          'Frontend',
          'Tailwind CSS',
          'D:\\Workspace\\my-project',
          [
            { name: 'Stage A', status: 'done' },
            { name: 'Stage B', status: 'running' },
          ],
          false,
        );
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderProjectOverviewPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderProjectOverviewPanel(
          'my-project',
          'D:\\Workspace\\my-project',
          'Predefined Template',
          'Frontend',
          'Portfolio Website',
          'Tailwind CSS',
          42,
          1200,
          '1.2.0',
          true,
          false,
        );
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderGeneratedFeaturesPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderGeneratedFeaturesPanel(['Hero', 'Skills', 'Experience'], false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderNextStepsPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderNextStepsPanel('my-project', false, false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });

  it('should ensure all rows in renderQuickTipsPanel are aligned to the exact same visual width', () => {
    const widths = [50, 60, 80];

    for (const width of widths) {
      const originalColumns = process.stdout.columns;
      Object.defineProperty(process.stdout, 'columns', {
        value: width,
        configurable: true,
      });

      try {
        const lines = renderQuickTipsPanel(['Tip 1', 'Tip 2'], false);
        const panelLines = lines.filter((line) => {
          const stripped = stripAnsi(line);
          return stripped.startsWith('┌') || stripped.startsWith('│') || stripped.startsWith('└');
        });

        expect(panelLines.length).toBeGreaterThan(0);

        for (const line of panelLines) {
          const stripped = stripAnsi(line);
          expect(stripped.length).toBe(width);

          if (stripped.startsWith('┌')) {
            expect(stripped.endsWith('┐')).toBe(true);
          } else if (stripped.startsWith('│')) {
            expect(stripped.endsWith('│')).toBe(true);
          } else if (stripped.startsWith('└')) {
            expect(stripped.endsWith('┘')).toBe(true);
          }
        }
      } finally {
        Object.defineProperty(process.stdout, 'columns', {
          value: originalColumns,
          configurable: true,
        });
      }
    }
  });
});
