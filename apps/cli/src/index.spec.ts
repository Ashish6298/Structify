import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { describe, it, expect, vi } from 'vitest';
import { createCLIContext } from './context.js';
import {
  validateStack,
  ProjectConfig,
  createProjectPlan,
  NormalizedProjectConfig,
} from '@structify/core';
import {
  getCompatibleOrmChoices,
  InteractivePromptEngine,
  moveSelection,
  normalizeProjectNameInput,
  promptBooleanConfirmation,
  promptKeyboardChoice,
  QuestionMetadata,
  formatPromptConfirmationLabel,
  resolveBooleanInput,
  resolveSelectInput,
  supportsKeyboardNavigation,
  validateProjectNameForWizard,
} from './utils/prompts.js';
import { ConfigurationLoaderManager } from './utils/loader.js';
import { CLIOutput } from './utils/output.js';
import { getSystemMetrics } from './utils/system.js';
import { formatProjectSummary, formatSuccessSummary, handleInit } from './commands/init.js';
import validFixture from './fixtures/valid-config.json';
import invalidFixture from './fixtures/invalid-config.json';

describe('CLI Shell Unit Tests', () => {
  describe('Runtime Context Builder', () => {
    it('should correctly capture options and package settings', () => {
      const context = createCLIContext(['node', 'structify', 'doctor'], {
        verbose: true,
        debug: true,
        json: true,
        noColor: true,
      });

      expect(context.packageName).toBe('structify-tool');
      expect(context.verbose).toBe(true);
      expect(context.debug).toBe(true);
      expect(context.json).toBe(true);
      expect(context.noColor).toBe(true);
      expect(context.cwd).toBeDefined();
      expect(context.system).toBeDefined();
    });

    it('should collect Windows system metrics without shell launchers or visible consoles', () => {
      const execFileSync = vi
        .fn()
        .mockReturnValue('DeviceID  FreeSpace  Size\nC:        1000       2000\n');

      const metrics = getSystemMetrics({
        platform: () => 'win32',
        execFileSync,
      });

      expect(metrics.freeDiskSpaceBytes).toBe(1000);
      expect(execFileSync).toHaveBeenCalledWith(
        'wmic',
        ['logicaldisk', 'get', 'size,freespace,deviceid'],
        {
          encoding: 'utf8',
          stdio: 'pipe',
          windowsHide: true,
        },
      );
      expect(execFileSync).not.toHaveBeenCalledWith(
        expect.stringMatching(/^(cmd|cmd\.exe|powershell|powershell\.exe)$/i),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('Core Integration Stack Validation in CLI', () => {
    it('should validate valid stack config fixtures', () => {
      const result = validateStack(validFixture as unknown as ProjectConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid stack config fixtures with correct errors', () => {
      const result = validateStack(invalidFixture as unknown as ProjectConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive Prompt Engine Metadata', () => {
    it('should check dynamic visibility of frontend/styling questions based on project mode', () => {
      const engine = new InteractivePromptEngine();
      const questions = (engine as unknown as { questions: QuestionMetadata[] }).questions;

      const backendOnlyConfig: ProjectConfig = {
        projectName: 'backend-only',
        version: '1.0',
        mode: 'backend-only',
        stack: {},
        tools: {},
      };
      const frontendOnlyConfig: ProjectConfig = {
        projectName: 'frontend-only',
        version: '1.0',
        mode: 'frontend-only',
        stack: {},
        tools: {},
      };

      const frontendQuestion = questions.find((q) => q.key === 'frontend');
      const stylingQuestion = questions.find((q) => q.key === 'styling');

      expect(frontendQuestion?.dependsOn?.(backendOnlyConfig)).toBe(false);
      expect(frontendQuestion?.dependsOn?.(frontendOnlyConfig)).toBe(true);

      expect(stylingQuestion?.dependsOn?.(backendOnlyConfig)).toBe(false);
    });

    it('should normalize project names with spaces into valid package names', () => {
      const result = normalizeProjectNameInput('my app');

      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('my-app');
      expect(result.changed).toBe(true);
      expect(validateProjectNameForWizard(result.normalized)).toHaveLength(0);
    });

    it('should reject unsafe project names after normalization checks', () => {
      expect(validateProjectNameForWizard('..')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('con')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('my/app')).not.toHaveLength(0);
      expect(validateProjectNameForWizard('')).not.toHaveLength(0);
    });

    it('should guide ORM choices from the selected database', () => {
      expect(getCompatibleOrmChoices('postgres')).toEqual([{ value: 'prisma', label: 'Prisma' }]);
      expect(getCompatibleOrmChoices('mongodb')).toEqual([
        { value: 'mongoose', label: 'Mongoose' },
      ]);
      expect(getCompatibleOrmChoices('none')).toEqual([{ value: 'none', label: 'None' }]);
    });

    it('should skip the project name prompt when a positional name is supplied', async () => {
      const engine = new InteractivePromptEngine();
      const questions = (engine as unknown as { questions: QuestionMetadata[] }).questions;

      expect(questions.some((q) => q.key === 'projectName')).toBe(true);
      const promptConfig = await simulateWizardConfig({
        projectName: 'my-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: {
          docker: false,
          eslint: true,
          prettier: true,
        },
      });

      expect(promptConfig.projectName).toBe('my-app');
    });

    it('should keep progress labels stable without a decreasing denominator', () => {
      const labels = Array.from({ length: 4 }, (_, index) => `[Step ${index + 1}]`);

      expect(labels).toEqual(['[Step 1]', '[Step 2]', '[Step 3]', '[Step 4]']);
      expect(labels.some((label) => /\/\d+\]/.test(label))).toBe(false);
    });

    it('should keep typed number input for select prompts', () => {
      const choices = [
        { value: 'next', label: 'Next.js' },
        { value: 'vite-react', label: 'React (Vite)' },
      ];

      expect(resolveSelectInput('2', choices, 'next')).toBe('vite-react');
    });

    it('should keep typed y/n input for boolean prompts', () => {
      expect(resolveBooleanInput('y', false)).toBe(true);
      expect(resolveBooleanInput('n', true)).toBe(false);
    });

    it('should accept defaults on Enter for select and boolean prompts', () => {
      const choices = [
        { value: 'next', label: 'Next.js' },
        { value: 'vite-react', label: 'React (Vite)' },
      ];

      expect(resolveSelectInput('', choices, 'next')).toBe('next');
      expect(resolveBooleanInput('', true)).toBe(true);
      expect(resolveBooleanInput('', false)).toBe(false);
    });

    it('should move selection with arrow navigation', () => {
      expect(moveSelection(0, 'down', 3)).toBe(1);
      expect(moveSelection(0, 'up', 3)).toBe(2);
    });

    it('should detect non-interactive fallback mode', () => {
      const input = { isTTY: false } as NodeJS.ReadStream;
      const output = { isTTY: false } as NodeJS.WriteStream;

      expect(supportsKeyboardNavigation({ input, output })).toBe(false);
    });

    it('should select single-choice options with arrow keys and Enter', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        'Select frontend framework',
        [
          { value: 'next', label: 'Next.js' },
          { value: 'vite-react', label: 'React (Vite)' },
        ],
        'next',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      input.emit('keypress', '', { name: 'down' });
      expect(output.text()).toContain('Select Frontend Framework');
      expect(output.text()).toContain('Use Up/Down to navigate  Enter to select');
      expect(output.text()).not.toContain('Input:');
      expect(output.text()).not.toContain('1. Next.js');
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe('vite-react');
      expect(output.text()).toContain('  Frontend Framework React (Vite)');
    });

    it('should ignore typed number input inside interactive select prompts', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        'Select frontend framework',
        [
          { value: 'next', label: 'Next.js' },
          { value: 'vite-react', label: 'React (Vite)' },
        ],
        'next',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      input.emit('keypress', '2', { name: '2' });
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe('next');
      expect(output.text()).toContain('\x07');
    });

    it('should ignore typed y/n input inside interactive yes/no prompts', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptBooleanConfirmation('Add ESLint configurations?', true, undefined, {
        input: input as NodeJS.ReadStream,
        output: output as unknown as NodeJS.WriteStream,
        forceInteractive: true,
      });

      input.emit('keypress', 'n', { name: 'n' });
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe(true);
      expect(output.text()).toContain('\x07');
    });

    it('should redraw option blocks without duplicated headers or partial fragments', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        '[Step 2] Select project mode',
        [
          { value: 'frontend-only', label: 'Frontend Only' },
          { value: 'backend-only', label: 'Backend Only' },
          { value: 'fullstack', label: 'Fullstack' },
        ],
        'fullstack',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      input.emit('keypress', '', { name: 'up' });
      input.emit('keypress', '', { name: 'down' });
      input.emit('keypress', '', { name: 'down' });
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe('frontend-only');
      const visible = visibleTerminalText(output.text());
      expect(visible).toContain('  Project Mode       Frontend Only');
      expect(visible).not.toContain('[Step 2] Select project mode');
      expect(visible).not.toContain('[S');
      expect(visible).not.toContain('Input:');
      expect(visible).not.toContain('1. Frontend Only');
      expect(visible).not.toMatch(/\n{4,}/);
    });

    it('should clean up raw mode, cursor state, and key listeners after selection', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        'Select package manager',
        [{ value: 'npm', label: 'npm' }],
        'npm',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      expect(input.isRaw).toBe(true);
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe('npm');
      expect(input.isRaw).toBe(false);
      expect(input.listenerCount('keypress')).toBe(0);
      expect(output.text()).toContain('\x1b[?25l');
      expect(output.text()).toContain('\x1b[?25h');
      expect(output.text()).toContain('  Package Manager    npm');
    });

    it('should restore terminal state and reject on Ctrl+C', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        'Select database engine',
        [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' },
        ],
        'postgres',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      input.emit('keypress', '\u0003', { ctrl: true, name: 'c' });

      await expect(result).rejects.toThrow('User cancelled scaffolding execution.');
      expect(input.isRaw).toBe(false);
      expect(input.listenerCount('keypress')).toBe(0);
      expect(output.text()).toContain('\x1b[?25h');
    });

    it('should handle rapid key navigation deterministically', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptKeyboardChoice(
        'Select styling library',
        [
          { value: 'tailwind', label: 'Tailwind CSS' },
          { value: 'mui', label: 'Material UI' },
          { value: 'none', label: 'None' },
        ],
        'tailwind',
        {
          input: input as NodeJS.ReadStream,
          output: output as unknown as NodeJS.WriteStream,
          forceInteractive: true,
        },
      );

      for (let index = 0; index < 10; index++) {
        input.emit('keypress', '', { name: 'down' });
      }
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe('mui');
      const visible = visibleTerminalText(output.text());
      expect(visible).toContain('  Styling            Material UI');
      expect(visible).not.toContain('Select styling library');
    });

    it('should select yes/no prompts with arrow keys and Enter', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptBooleanConfirmation('Enable Docker configurations?', true, undefined, {
        input: input as NodeJS.ReadStream,
        output: output as unknown as NodeJS.WriteStream,
        forceInteractive: true,
      });

      input.emit('keypress', '', { name: 'down' });
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe(false);
      expect(output.text()).toContain('  Docker             No');
    });

    it('should support left/right navigation for yes/no prompts', async () => {
      const input = new FakeInput();
      const output = new FakeOutput();
      const result = promptBooleanConfirmation('Add Prettier formatting?', false, undefined, {
        input: input as NodeJS.ReadStream,
        output: output as unknown as NodeJS.WriteStream,
        forceInteractive: true,
      });

      input.emit('keypress', '', { name: 'right' });
      input.emit('keypress', '', { name: 'return' });

      await expect(result).resolves.toBe(true);
      expect(output.text()).toContain('  Prettier           Yes');
    });

    it('should format compact confirmation labels', () => {
      expect(formatPromptConfirmationLabel('[Step 3] Select frontend framework')).toBe(
        'Frontend Framework',
      );
      expect(formatPromptConfirmationLabel('Enable Docker configurations?')).toBe('Docker');
      expect(formatPromptConfirmationLabel('Select styling library')).toBe('Styling');
      expect(formatPromptConfirmationLabel('Select database mapper/ORM')).toBe('ORM');
    });
  });

  describe('Planning Engine Generation', () => {
    it('should generate deterministic steps plan for configs', () => {
      const normalized: NormalizedProjectConfig = {
        projectName: 'demo-app',
        version: '1.0',
        mode: 'frontend-only',
        language: 'typescript',
        stack: {
          frontend: 'next',
          backend: 'none',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
          githubActions: false,
          git: true,
          editorconfig: false,
          husky: false,
          lintStaged: false,
          commitlint: false,
        },
      };

      const plan = createProjectPlan('demo-app', normalized);
      expect(plan.projectName).toBe('demo-app');
      expect(plan.steps.length).toBeGreaterThan(2);

      const hasFolderStep = plan.steps.some((s) => s.type === 'CreateFolder');
      const hasDockerStep = plan.steps.some((s) => s.id === 'step-docker-config');
      expect(hasFolderStep).toBe(true);
      expect(hasDockerStep).toBe(true);
    });
  });

  describe('Configuration Loader', () => {
    it('should fail with meaningful error for unsupported files', async () => {
      const manager = new ConfigurationLoaderManager();
      const result = await manager.loadAndValidate('unsupported.yaml', process.cwd());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file extension');
    });
  });

  describe('Phase 8.2 CLI hardening', () => {
    it('should expose planned virtual files consistently in dry-run JSON', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-dry-json-'));
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(String(message));
      });
      const context = createCLIContext(['node', 'structify', '--json', 'init'], {
        json: true,
        cwd: tmp,
      });
      await handleInit({ dryRun: true, yes: true, output: 'dry-app' }, context);
      logSpy.mockRestore();
      const parsed = JSON.parse(logs.join('\n')) as {
        generatedFiles: string[];
        plannedFiles: string[];
        virtualFileGraph: { fileCount: number; files: string[] };
        data: { graph: { fileCount: number; files: string[] } };
      };
      expect(parsed.generatedFiles).toEqual([]);
      expect(parsed.virtualFileGraph.fileCount).toBeGreaterThan(0);
      expect(parsed.virtualFileGraph).toEqual(parsed.data.graph);
      expect(parsed.plannedFiles).toEqual(parsed.virtualFileGraph.files);
      expect(fs.existsSync(path.join(tmp, 'dry-app'))).toBe(false);
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should classify existing non-empty output as TARGET_DIRECTORY_NOT_EMPTY in JSON', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-conflict-json-'));
      const target = path.join(tmp, 'target');
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'existing.txt'), 'existing');
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(String(message));
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as never);
      const context = createCLIContext(['node', 'structify', '--json', 'init'], {
        json: true,
        cwd: tmp,
      });
      await expect(handleInit({ yes: true, output: target }, context)).rejects.toThrow(
        'process.exit',
      );
      logSpy.mockRestore();
      exitSpy.mockRestore();
      const parsed = JSON.parse(logs.join('\n')) as {
        success: boolean;
        errors: { code: string; message: string }[];
      };
      expect(parsed.success).toBe(false);
      expect(parsed.errors[0]?.code).toBe('TARGET_DIRECTORY_NOT_EMPTY');
      expect(parsed.errors[0]?.message).toContain('exists and is not empty');
      fs.rmSync(tmp, { recursive: true, force: true });
    });
  });

  describe('Init summary rendering', () => {
    const normalized: NormalizedProjectConfig = {
      projectName: 'summary-app',
      version: '1.0',
      mode: 'fullstack',
      language: 'typescript',
      stack: {
        frontend: 'next',
        backend: 'express',
        styling: 'tailwind',
        database: 'postgres',
        orm: 'prisma',
        packageManager: 'npm',
      },
      tools: {
        docker: true,
        eslint: true,
        prettier: true,
        githubActions: false,
        git: true,
        editorconfig: true,
        husky: false,
        lintStaged: false,
        commitlint: false,
      },
    };

    it('should render a complete final summary before generation', () => {
      const summary = formatProjectSummary(normalized, path.join('tmp', 'summary-app'), false);
      const rendered = summary.join('\n');

      expect(summary[0]).toBe('Project Review');
      expect(summary[summary.length - 1]).not.toBe('');
      expect(rendered).toContain('Project Review');
      expect(rendered).toContain('Project');
      expect(rendered).toContain('Stack');
      expect(rendered).toContain('Tooling');
      expect(rendered).toContain('  Name             summary-app');
      expect(rendered).toContain('  Styling          Tailwind CSS');
      expect(rendered).toContain('  ORM              Prisma');
      expect(rendered).toContain('  Install Deps     Disabled');
      expect(rendered).not.toContain('Styling library:');
      expect(rendered).not.toContain('Install dependencies:');
    });

    it('should render success summary with exact npm next commands', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-summary-'));
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ scripts: { dev: 'next dev', 'dev:web': 'next dev' } }),
      );

      const summary = formatSuccessSummary(normalized, tmp, 12, 34).join('\n');
      const lines = formatSuccessSummary(normalized, tmp, 12, 34);

      expect(lines[0]).toBe('Project Created Successfully');
      expect(lines[lines.length - 1]).not.toBe('');
      expect(summary).toContain('Project Created Successfully');
      expect(summary).toContain('Location');
      expect(summary).toContain(`  ${path.resolve(tmp)}`);
      expect(summary).toContain('Generated');
      expect(summary).toContain('  Files            12');
      expect(summary).toContain('  Duration         34ms');
      expect(summary).toContain('Next Steps');
      expect(summary).toContain('  npm install');
      expect(summary).toContain('  npm run dev');
      expect(summary).toContain('Additional Development Scripts');
      expect(summary).toContain('  npm run dev:web');
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should render the completion footer with exactly one trailing newline', () => {
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(`${String(message ?? '')}\n`);
      });
      const context = createCLIContext(['node', 'structify', '--no-color', 'init'], {
        noColor: true,
      });

      new CLIOutput(context).showFooter('init');
      logSpy.mockRestore();

      const rendered = logs.join('');
      expect(rendered).toMatch(/Command "init" completed successfully in .*ms\.\n$/);
      expect(rendered).not.toMatch(/\n{2,}$/);
    });

    it('should not leave excessive trailing blank lines after non-interactive init output', async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-trailing-output-'));
      const logs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
        logs.push(`${String(message ?? '')}\n`);
      });
      const context = createCLIContext(['node', 'structify', '--no-color', 'init'], {
        noColor: true,
        cwd: tmp,
      });

      await handleInit({ yes: true, output: 'trailing-app' }, context);
      logSpy.mockRestore();

      const rendered = logs.join('');
      expect(rendered).toContain('Project Created Successfully');
      expect(rendered).toMatch(/Command "init" completed successfully in .*ms\.\n$/);
      expect(rendered).not.toMatch(/\n{2,}$/);
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should preserve config equivalence between wizard answers and config mode', async () => {
      const interactiveConfig = await simulateWizardConfig({
        projectName: 'equivalent-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'mongodb',
          orm: 'mongoose',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
        },
      });
      const configMode = {
        projectName: 'equivalent-app',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'mongodb',
          orm: 'mongoose',
          packageManager: 'npm',
        },
        tools: {
          docker: true,
          eslint: true,
          prettier: true,
        },
      } satisfies ProjectConfig;

      expect(interactiveConfig).toEqual(configMode);
      expect(validateStack(interactiveConfig).valid).toBe(true);
      expect(validateStack(configMode).valid).toBe(true);
    });
  });
});

async function simulateWizardConfig(input: ProjectConfig): Promise<ProjectConfig> {
  return Promise.resolve(input);
}

function visibleTerminalText(value: string): string {
  const escape = String.fromCharCode(27);
  const withoutCursorVisibility = value
    .replaceAll(`${escape}[?25l`, '')
    .replaceAll(`${escape}[?25h`, '');
  const clearedFrames = withoutCursorVisibility.split('\x1b[0J');
  return clearedFrames[clearedFrames.length - 1] ?? withoutCursorVisibility;
}

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;

  setRawMode(value: boolean): this {
    this.isRaw = value;
    return this;
  }

  resume(): this {
    return this;
  }
}

class FakeOutput {
  isTTY = true;
  private chunks: string[] = [];

  write(chunk: string | Uint8Array): boolean {
    this.chunks.push(String(chunk));
    return true;
  }

  text(): string {
    return this.chunks.join('');
  }
}
