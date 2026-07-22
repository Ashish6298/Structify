import readline from 'readline';
import path from 'path';
import {
  ProjectConfig,
  validateProjectName,
  validateStack,
  ProjectMode,
  DatabaseOption,
  OrmOption,
  PREDEFINED_TEMPLATES,
} from '@structify/core';
import { StructifyCLIError } from './error.js';
import { CLIContext } from '../context.js';
import {
  renderWelcomeSection,
  renderSetupPanel,
  getTheme,
  renderProjectNamePanel,
  renderCategoryPanel,
  renderTemplatePanel,
  renderStylingPanel,
  renderReviewPanel,
  renderReadyToGeneratePanel,
  renderWizardSelectionPanel,
} from './ui.js';

export interface QuestionMetadata {
  key: string;
  question: string;
  type: 'text' | 'select' | 'boolean';
  choices?:
    | { value: string; label: string }[]
    | ((config: ProjectConfig) => { value: string; label: string }[]);
  defaultValue?: string | boolean;
  description?: string;
  dependsOn?: (config: ProjectConfig) => boolean;
  validate?: (input: string) => string | true;
  defaultValueCallback?: (config: ProjectConfig) => string | boolean;
}

export interface PromptRunOptions {
  projectName?: string;
}

export interface ProjectNameNormalizationResult {
  valid: boolean;
  normalized: string;
  errors: string[];
  changed: boolean;
}

export interface KeyboardPromptOptions {
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
  forceInteractive?: boolean;
  confirmationLabel?: string;
  step?: number;
  totalSteps?: number;
}

interface PromptChoice {
  value: string;
  label: string;
}

const CUSTOM_CHOICE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  mode: {
    'frontend-only': 'Generate a frontend application without a backend service.',
    'backend-only': 'Generate a backend service without a frontend application.',
    fullstack: 'Generate frontend and backend applications together.',
  },
  frontend: {
    next: 'Generate the existing Next.js frontend structure.',
    'vite-react': 'Generate the existing React and Vite frontend structure.',
    none: 'Do not include a frontend framework.',
  },
  backend: {
    express: 'Generate the existing Express backend structure.',
    nest: 'Generate the existing NestJS backend structure.',
    none: 'Do not include a backend framework.',
  },
  styling: {
    tailwind: 'Include the existing Tailwind CSS configuration.',
    mui: 'Include the existing Material UI configuration.',
    none: 'Do not include a styling system.',
  },
  database: {
    postgres: 'Configure the existing PostgreSQL database option.',
    mongodb: 'Configure the existing MongoDB database option.',
    none: 'Do not configure a database.',
  },
  orm: {
    prisma: 'Use the existing Prisma configuration for PostgreSQL.',
    mongoose: 'Use the existing Mongoose configuration for MongoDB.',
    none: 'Do not configure a data mapper.',
  },
  packageManager: { npm: 'Use npm for generated project commands.' },
  docker: {
    true: 'Include the existing Docker configuration files.',
    false: 'Do not include Docker configuration files.',
  },
  eslint: {
    true: 'Include the existing ESLint configuration files.',
    false: 'Do not include ESLint configuration files.',
  },
  prettier: {
    true: 'Include the existing Prettier configuration files.',
    false: 'Do not include Prettier configuration files.',
  },
};

const WINDOWS_RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

export function normalizeProjectNameInput(input: string): ProjectNameNormalizationResult {
  const trimmed = input.trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/[/\\:]/g, '-')
    .replace(/[^a-z0-9-_.\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/[._-]+$/, '');
  const errors = validateProjectNameForWizard(normalized);

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    changed: trimmed !== normalized,
  };
}

export function validateProjectNameForWizard(name: string): string[] {
  const errors = [...validateProjectName(name)];
  const lower = name.toLowerCase();

  if (name.includes('/') || name.includes('\\')) {
    errors.push('Project name cannot include path separators.');
  }

  if (name === '.' || name === '..' || name.includes('..')) {
    errors.push('Project name cannot include path traversal segments.');
  }

  if (pathLikeName(name)) {
    errors.push('Project name must be a package name, not a path.');
  }

  if (WINDOWS_RESERVED_NAMES.has(lower)) {
    errors.push(`"${name}" is reserved on Windows.`);
  }

  return [...new Set(errors)];
}

export function getCompatibleOrmChoices(database: DatabaseOption | undefined): {
  value: string;
  label: string;
}[] {
  if (database === 'postgres') {
    return [{ value: 'prisma', label: 'Prisma' }];
  }
  if (database === 'mongodb') {
    return [{ value: 'mongoose', label: 'Mongoose' }];
  }
  return [{ value: 'none', label: 'None' }];
}

function pathLikeName(name: string): boolean {
  return /^[a-zA-Z]:/.test(name) || name.includes(':');
}

export function supportsKeyboardNavigation(options: KeyboardPromptOptions = {}): boolean {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;

  if (options.forceInteractive) {
    return typeof input.setRawMode === 'function' && typeof output.write === 'function';
  }

  return (
    process.env.CI !== 'true' &&
    process.env.TERM !== 'dumb' &&
    input.isTTY === true &&
    output.isTTY === true &&
    typeof input.setRawMode === 'function' &&
    typeof output.write === 'function'
  );
}

export function resolveSelectInput(
  rawAnswer: string,
  choices: { value: string; label: string }[],
  defaultValue: string | boolean | undefined,
): string | undefined {
  const answer = rawAnswer.trim().toLowerCase();
  if (answer === '') {
    return String(defaultValue);
  }

  const num = parseInt(answer, 10);
  if (!isNaN(num) && num > 0 && num <= choices.length) {
    return choices[num - 1]?.value;
  }

  return choices.find((choice) => choice.value === answer)?.value;
}

export function resolveBooleanInput(
  rawAnswer: string,
  defaultValue: string | boolean | undefined,
): boolean {
  const answer = rawAnswer.trim().toLowerCase();
  if (answer === '') {
    return Boolean(defaultValue);
  }
  return answer.startsWith('y') || answer === 'true';
}

export function moveSelection(
  currentIndex: number,
  keyName: string | undefined,
  choiceCount: number,
): number {
  if (choiceCount <= 0) {
    return 0;
  }

  if (keyName === 'up' || keyName === 'left') {
    return (currentIndex - 1 + choiceCount) % choiceCount;
  }

  if (keyName === 'down' || keyName === 'right') {
    return (currentIndex + 1) % choiceCount;
  }

  return currentIndex;
}

class StablePromptRenderer {
  private renderedLines = 0;

  constructor(
    private output: NodeJS.WriteStream,
    private message: string,
    private choices: PromptChoice[],
    private confirmationLabel: string,
    private step?: number,
    private totalSteps?: number,
  ) {}

  render(selectedIndex: number): void {
    if (this.renderedLines > 0) {
      readline.moveCursor(this.output, 0, -this.renderedLines);
      readline.clearScreenDown(this.output);
    }

    const lines =
      this.confirmationLabel === 'Generate Project'
        ? renderReadyToGeneratePanel(
            selectedIndex,
            process.env.NO_COLOR === 'true' || process.argv.includes('--no-color'),
            false,
          )
        : [
            ...this.createHeaderBlock(),
            '',
            'Use Up/Down to navigate  Enter to select',
            '',
            ...this.createOptionBlock(selectedIndex),
          ];
    this.output.write(`${lines.join('\n')}\n`);
    this.renderedLines = lines.length;
  }

  confirm(choice: PromptChoice): void {
    if (this.renderedLines > 0) {
      readline.moveCursor(this.output, 0, -this.renderedLines);
      readline.clearScreenDown(this.output);
    }
    this.output.write(`${formatAlignedRow(this.confirmationLabel, choice.label)}\n`);
    this.renderedLines = 1;
  }

  cancel(): void {
    this.output.write('\n');
  }

  private createOptionBlock(selectedIndex: number): string[] {
    return this.choices.map((choice, index) => {
      const marker = index === selectedIndex ? '>' : ' ';
      return `${marker} ${choice.label}`;
    });
  }

  private createHeaderBlock(): string[] {
    const title = formatPromptTitle(this.message);
    if (this.step && this.totalSteps) {
      return [`Step ${this.step} of ${this.totalSteps}`, title];
    }
    return [title];
  }
}

const promptCleanups = new Set<() => void>();

export function registerPromptCleanup(cleanup: () => void): () => void {
  promptCleanups.add(cleanup);
  return () => {
    promptCleanups.delete(cleanup);
  };
}

export function runCentralizedCleanup(): void {
  for (const cleanup of promptCleanups) {
    try {
      cleanup();
    } catch (e) {
      // ignore
    }
  }
  promptCleanups.clear();

  try {
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(false);
    }
  } catch (e) {
    // ignore
  }

  try {
    process.stdin.pause();
  } catch (e) {
    // ignore
  }

  try {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h');
    }
  } catch (e) {
    // ignore
  }
}

async function askTypedLine(promptText: string): Promise<string> {
  runCentralizedCleanup();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      unregister();
      rl.removeAllListeners('SIGINT');
      rl.close();
      try {
        process.stdin.pause();
      } catch (e) {
        // ignore
      }
    };

    const unregister = registerPromptCleanup(cleanup);

    rl.on('SIGINT', () => {
      cleanup();
      reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
    });

    rl.question(promptText, (answer) => {
      cleanup();
      resolve(answer.trim());
    });
  });
}

export async function promptKeyboardChoice(
  message: string,
  choices: PromptChoice[],
  defaultValue: string | boolean | undefined,
  options: KeyboardPromptOptions = {},
): Promise<string> {
  runCentralizedCleanup();

  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const defaultIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === String(defaultValue)),
  );
  let selectedIndex = defaultIndex;
  const wasRaw = input.isRaw === true;
  const renderer = new StablePromptRenderer(
    output,
    message,
    choices,
    options.confirmationLabel || formatPromptConfirmationLabel(message),
    options.step,
    options.totalSteps,
  );
  let settled = false;

  readline.emitKeypressEvents(input);
  try {
    input.setRawMode?.(true);
  } catch (e) {
    // ignore
  }
  try {
    input.resume();
  } catch (e) {
    // ignore
  }
  if (output.isTTY) {
    output.write('\x1b[?25l');
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      unregister();
      input.off('keypress', onKeypress);
      try {
        input.setRawMode?.(wasRaw);
      } catch (e) {
        // ignore
      }
      try {
        input.pause();
      } catch (e) {
        // ignore
      }
      if (output.isTTY) {
        output.write('\x1b[?25h');
      }
    };

    const unregister = registerPromptCleanup(cleanup);

    const render = () => {
      renderer.render(selectedIndex);
    };

    const finish = (value: string) => {
      cleanup();
      const choice = choices.find((item) => item.value === value);
      renderer.confirm(choice || { value, label: value });
      resolve(value);
    };

    const onKeypress = (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        renderer.cancel();
        reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
        return;
      }

      if (
        key.name === 'up' ||
        key.name === 'down' ||
        (isBooleanChoiceSet(choices) && (key.name === 'left' || key.name === 'right'))
      ) {
        selectedIndex = moveSelection(selectedIndex, key.name, choices.length);
        render();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish(choices[selectedIndex]?.value || String(defaultValue));
        return;
      }

      if (str && str >= ' ' && str !== '\x7f') {
        output.write('\x07');
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}

/**
 * The custom branch uses the same panel primitive as the predefined branch.
 * It deliberately owns one keypress handler for its lifetime and resolves a
 * back action instead of nesting another prompt loop.
 */
async function promptCustomKeyboardChoice(
  question: QuestionMetadata,
  choices: PromptChoice[],
  defaultValue: string | boolean | undefined,
  step: number,
  totalSteps: number,
  summary: Array<{ label: string; value: string }>,
  noColor: boolean,
  showWelcome = false,
): Promise<string | '__back__'> {
  runCentralizedCleanup();
  const input = process.stdin;
  const output = process.stdout;
  const wasRaw = input.isRaw === true;
  let selectedIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === String(defaultValue)),
  );
  let renderedLines = 0;
  let settled = false;

  readline.emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.resume();
  if (output.isTTY) output.write('\x1b[?25l');

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (settled) return;
      settled = true;
      unregister();
      input.off('keypress', onKeypress);
      try {
        input.setRawMode?.(wasRaw);
      } catch {
        // Intentionally ignored during terminal cleanup.
      }
      try {
        input.pause();
      } catch {
        // Intentionally ignored during terminal cleanup.
      }
      if (output.isTTY) output.write('\x1b[?25h');
    };
    const unregister = registerPromptCleanup(cleanup);
    const render = () => {
      if (renderedLines > 0) {
        readline.moveCursor(output, 0, -renderedLines);
        readline.clearScreenDown(output);
      }
      const panel = renderWizardSelectionPanel(
        formatPromptTitle(question.question),
        step,
        totalSteps,
        selectedIndex,
        choices.map((choice) => ({
          label: choice.label,
          description:
            CUSTOM_CHOICE_DESCRIPTIONS[question.key]?.[choice.value] ||
            'Select this existing option.',
        })),
        summary,
        noColor,
      );
      const lines = showWelcome
        ? [...renderWelcomeSection(noColor).slice(0, -1), '', ...panel]
        : panel;
      output.write(`${lines.join('\n')}\n`);
      renderedLines = lines.length;
    };
    const onKeypress = (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        output.write('\n');
        reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
      } else if (key.name === 'escape') {
        cleanup();
        resolve('__back__');
      } else if (
        key.name === 'up' ||
        key.name === 'down' ||
        (isBooleanChoiceSet(choices) && (key.name === 'left' || key.name === 'right'))
      ) {
        selectedIndex = moveSelection(selectedIndex, key.name, choices.length);
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        const value = choices[selectedIndex]?.value || String(defaultValue);
        cleanup();
        resolve(value);
      } else if (str && str >= ' ' && str !== '\x7f') {
        output.write('\x07');
      }
    };
    input.on('keypress', onKeypress);
    render();
  });
}

function isBooleanChoiceSet(choices: PromptChoice[]): boolean {
  const values = choices.map((choice) => choice.value).sort();
  return values.length === 2 && values[0] === 'false' && values[1] === 'true';
}

export function formatPromptConfirmationLabel(message: string): string {
  const withoutStep = message.replace(/^\s*\[Step\s+\d+\]\s*/i, '').trim();
  const cleaned = withoutStep
    .replace(/\?$/, '')
    .replace(/^Select\s+/i, '')
    .replace(/^Add\s+/i, '')
    .replace(/^Enable\s+/i, '')
    .replace(/\s+configurations$/i, '')
    .replace(/\s+formatting$/i, '')
    .trim();

  if (cleaned.length === 0) {
    return 'Selection';
  }

  return normalizePromptLabel(
    cleaned
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  );
}

function formatPromptTitle(message: string): string {
  const withoutStep = message.replace(/^\s*\[Step\s+\d+\]\s*/i, '').trim();
  const title = withoutStep
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const titles: Record<string, string> = {
    'Select Styling Library': 'Select Styling',
    'Select Database Engine': 'Select Database',
    'Select Database Mapper/ORM': 'Select ORM',
  };
  return titles[title] || title;
}

function normalizePromptLabel(label: string): string {
  const labels: Record<string, string> = {
    'Project Mode': 'Project Mode',
    'Frontend Framework': 'Frontend Framework',
    'Backend Framework': 'Backend Framework',
    'Styling Library': 'Styling',
    'Database Engine': 'Database',
    'Database Mapper/ORM': 'ORM',
    'Package Manager': 'Package Manager',
    Docker: 'Docker',
    Eslint: 'ESLint',
    Prettier: 'Prettier',
    'Generate This Project And Write Files To Disk': 'Generate Project',
  };
  return labels[label] || label;
}

function formatAlignedRow(label: string, value: string): string {
  return `  ${label.padEnd(18)} ${value}`;
}

export async function promptBooleanConfirmation(
  question: string,
  defaultValue: boolean,
  rl?: readline.Interface,
  options: KeyboardPromptOptions = {},
): Promise<boolean> {
  if (supportsKeyboardNavigation(options)) {
    const rawAnswer = await promptKeyboardChoice(
      question,
      [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
      String(defaultValue),
      options,
    );
    return resolveBooleanInput(rawAnswer, defaultValue);
  }

  const promptText = `${question} (y/n) [Default: ${defaultValue ? 'y' : 'n'}]: `;
  const answer = await new Promise<string>((resolve, reject) => {
    if (rl) {
      rl.question(promptText, (confirmation) => resolve(confirmation.trim()));
      return;
    }

    askTypedLine(promptText).then(resolve).catch(reject);
  });

  return resolveBooleanInput(answer, defaultValue);
}

export class InteractivePromptEngine {
  private questions: QuestionMetadata[] = [];

  constructor() {
    this.defineQuestions();
  }

  private defineQuestions() {
    this.questions = [
      {
        key: 'projectName',
        question: 'Enter project name',
        type: 'text',
        defaultValue: 'my-structify-app',
        validate: (input) => {
          const errors = validateProjectNameForWizard(input);
          if (errors.length > 0) {
            return errors[0] || 'Project name is invalid.';
          }
          return true;
        },
      },
      {
        key: 'mode',
        question: 'Select project mode',
        type: 'select',
        choices: [
          { value: 'frontend-only', label: 'Frontend Only' },
          { value: 'backend-only', label: 'Backend Only' },
          { value: 'fullstack', label: 'Fullstack' },
        ],
        defaultValue: 'fullstack',
      },
      {
        key: 'frontend',
        question: 'Select frontend framework',
        type: 'select',
        choices: [
          { value: 'next', label: 'Next.js' },
          { value: 'vite-react', label: 'React (Vite)' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: 'next',
        dependsOn: (cfg: ProjectConfig) => cfg.mode !== 'backend-only',
      },
      {
        key: 'backend',
        question: 'Select backend framework',
        type: 'select',
        choices: [
          { value: 'express', label: 'Express' },
          { value: 'nest', label: 'NestJS' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: 'none',
        dependsOn: (cfg: ProjectConfig) => cfg.mode !== 'frontend-only',
        defaultValueCallback: (cfg: ProjectConfig) => {
          return cfg.mode === 'fullstack' ? 'express' : 'none';
        },
      },
      {
        key: 'styling',
        question: 'Select styling library',
        type: 'select',
        choices: [
          { value: 'tailwind', label: 'Tailwind CSS' },
          { value: 'mui', label: 'Material UI (MUI)' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: 'tailwind',
        dependsOn: (cfg: ProjectConfig) =>
          cfg.mode !== 'backend-only' && cfg.stack.frontend !== 'none',
      },
      {
        key: 'database',
        question: 'Select database engine',
        type: 'select',
        choices: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: 'none',
      },
      {
        key: 'orm',
        question: 'Select database mapper/ORM',
        type: 'select',
        choices: (cfg) => getCompatibleOrmChoices(cfg.stack.database as DatabaseOption | undefined),
        defaultValue: 'none',
        dependsOn: (cfg: ProjectConfig) => cfg.stack.database !== 'none',
        // Auto-guiding defaults depending on selected DB
        defaultValueCallback: (cfg: ProjectConfig) => {
          if (cfg.stack.database === 'postgres') return 'prisma';
          if (cfg.stack.database === 'mongodb') return 'mongoose';
          return 'none';
        },
      },
      {
        key: 'packageManager',
        question: 'Select package manager',
        type: 'select',
        choices: [{ value: 'npm', label: 'npm' }],
        defaultValue: 'npm',
      },
      {
        key: 'docker',
        question: 'Enable Docker configurations?',
        type: 'boolean',
        defaultValue: false,
      },
      {
        key: 'eslint',
        question: 'Add ESLint configurations?',
        type: 'boolean',
        defaultValue: true,
      },
      {
        key: 'prettier',
        question: 'Add Prettier formatting?',
        type: 'boolean',
        defaultValue: true,
      },
    ];
  }

  async run(options: PromptRunOptions = {}): Promise<ProjectConfig> {
    const config: ProjectConfig & {
      projectName?: string;
      stack: Record<string, string | undefined>;
      tools: Record<string, boolean | undefined>;
    } = {
      projectName: 'my-structify-app',
      version: '1.0',
      stack: {},
      tools: {},
    };

    if (options.projectName) {
      config.projectName = options.projectName;
    }

    const skippedKeys = new Set<string>();
    if (options.projectName) {
      skippedKeys.add('projectName');
    }

    let currentIndex = 0;
    let displayedStep = 1;
    const totalSteps = this.questions.filter((q) => !skippedKeys.has(q.key)).length;
    const keyboardMode = supportsKeyboardNavigation();
    const noColor = process.env.NO_COLOR === 'true' || process.argv.includes('--no-color');

    let prompting = true;
    while (prompting) {
      const activeQuestions = this.questions.filter(
        (q) => !skippedKeys.has(q.key) && (!q.dependsOn || q.dependsOn(config)),
      );
      if (currentIndex >= activeQuestions.length) {
        prompting = false;
        continue;
      }
      const q = activeQuestions[currentIndex];

      const promptHeading = `\n[Step ${displayedStep}] ${q.question}`;
      let promptText = promptHeading;
      const resolvedDefault = q.defaultValueCallback
        ? q.defaultValueCallback(config)
        : q.defaultValue;
      const choices = typeof q.choices === 'function' ? q.choices(config) : q.choices;

      if (q.type === 'select' && choices) {
        promptText += '\nOptions:\n';
        choices.forEach((choice, idx) => {
          promptText += `  ${idx + 1}. ${choice.label} (${choice.value})\n`;
        });
        promptText += `Enter number [Default: ${resolvedDefault}]: `;
      } else if (q.type === 'boolean') {
        promptText += ` (y/n) [Default: ${resolvedDefault ? 'y' : 'n'}]: `;
      } else {
        promptText += ` [Default: ${resolvedDefault}]: `;
      }

      let rawAnswer: string;
      if (keyboardMode && ((q.type === 'select' && choices) || q.type === 'boolean')) {
        const answer = await promptCustomKeyboardChoice(
          q,
          q.type === 'boolean'
            ? [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]
            : choices || [],
          q.type === 'boolean' ? String(Boolean(resolvedDefault)) : resolvedDefault,
          displayedStep,
          totalSteps,
          getCustomSelectionSummary(config),
          noColor,
          currentIndex === 0,
        );
        if (answer === '__back__') {
          if (currentIndex > 0) {
            currentIndex--;
            displayedStep--;
          }
          continue;
        }
        rawAnswer = answer;
      } else {
        rawAnswer = await askTypedLine(promptText);
      }

      let finalValue: string | boolean | undefined;

      if (rawAnswer === '') {
        finalValue = resolvedDefault;
      } else if (q.type === 'boolean') {
        finalValue = resolveBooleanInput(rawAnswer, resolvedDefault);
      } else if (q.type === 'select' && choices) {
        finalValue = resolveSelectInput(rawAnswer, choices, resolvedDefault);
        if (!finalValue) {
          console.log(
            `\x1b[31mInvalid choice. Please choose a number from 1 to ${choices.length}.\x1b[0m`,
          );
          continue;
        }
      } else {
        finalValue = rawAnswer;
      }

      if (q.key === 'projectName' && typeof finalValue === 'string') {
        const projectName = await this.resolveProjectName(finalValue);
        if (!projectName) {
          continue;
        }
        finalValue = projectName;
      } else if (q.validate) {
        const valRes = q.validate(String(finalValue));
        if (valRes !== true) {
          console.log(`\x1b[31mError: ${valRes}\x1b[0m`);
          continue;
        }
      }

      // Apply configuration value
      if (q.key === 'projectName') {
        config.projectName = finalValue as string;
      } else if (q.key === 'mode') {
        config.mode = finalValue as unknown as ProjectMode;
        if (config.mode === 'frontend-only') {
          config.stack.backend = 'none';
        }
        if (config.mode === 'backend-only') {
          config.stack.frontend = 'none';
          config.stack.styling = 'none';
        }
      } else if (['docker', 'eslint', 'prettier'].includes(q.key)) {
        config.tools[q.key] = finalValue as boolean;
      } else {
        config.stack[q.key] = finalValue as string;
        if (q.key === 'database' && finalValue === 'none') {
          config.stack.orm = 'none';
        } else if (q.key === 'database') {
          config.stack.orm = getCompatibleOrmChoices(finalValue as DatabaseOption)[0]
            ?.value as OrmOption;
        }
      }

      // Run validation against core after each step
      const stackConfigParam = {
        projectName: config.projectName || 'my-project',
        version: '1.0',
        mode: config.mode,
        stack: {
          frontend: config.stack.frontend ?? 'none',
          backend: config.stack.backend ?? 'none',
          styling: config.stack.styling ?? 'none',
          database: config.stack.database ?? 'none',
          orm: config.stack.orm ?? 'none',
          packageManager: config.stack.packageManager ?? 'npm',
        },
        tools: config.tools,
      };

      const validation = validateStack(stackConfigParam);
      if (
        !validation.valid &&
        validation.errors.some(
          (e) => e.code !== 'EMPTY_SELECTION' && e.code !== 'INVALID_MODE_STACK',
        )
      ) {
        console.log(`\x1b[31mCompatibility Error: ${validation.errors[0].message}\x1b[0m`);
        continue;
      }

      currentIndex++;
      displayedStep++;
    }

    return config;
  }

  private async resolveProjectName(rawName: string): Promise<string | undefined> {
    const normalized = normalizeProjectNameInput(rawName);
    if (!normalized.valid) {
      console.log(`\x1b[31mError: ${normalized.errors[0]}\x1b[0m`);
      return undefined;
    }

    if (!normalized.changed) {
      return normalized.normalized;
    }

    const accepted = await promptBooleanConfirmation(
      `Project name "${rawName}" will be normalized to "${normalized.normalized}". Use this name?`,
      true,
    );

    if (accepted) {
      return normalized.normalized;
    }

    console.log('Please enter a different project name.');
    return undefined;
  }
}

export async function promptProjectNameInput(
  defaultName: string = 'my-structify-app',
): Promise<string> {
  let asking = true;
  let resultName = '';
  while (asking) {
    const rawAnswer = await askTypedLine(`\nEnter project name [Default: ${defaultName}]: `);
    const finalValue = rawAnswer === '' ? defaultName : rawAnswer;
    const normalized = normalizeProjectNameInput(finalValue);
    if (!normalized.valid) {
      console.log(`\x1b[31mError: ${normalized.errors[0]}\x1b[0m`);
      continue;
    }
    if (normalized.changed) {
      const accepted = await promptBooleanConfirmation(
        `Project name "${finalValue}" will be normalized to "${normalized.normalized}". Use this name?`,
        true,
      );
      if (!accepted) {
        continue;
      }
    }
    resultName = normalized.normalized;
    asking = false;
  }
  return resultName;
}

export async function promptKeyboardChoiceWithFallback(
  message: string,
  choices: PromptChoice[],
  defaultValue: string | boolean | undefined,
  options: KeyboardPromptOptions = {},
): Promise<string> {
  if (supportsKeyboardNavigation(options)) {
    return promptKeyboardChoice(message, choices, defaultValue, options);
  }
  let promptText = `\n${message}\n`;
  choices.forEach((choice, idx) => {
    promptText += `  ${idx + 1}. ${choice.label} (${choice.value})\n`;
  });
  promptText += `Enter choice/number [Default: ${defaultValue}]: `;
  const ans = await askTypedLine(promptText);
  const resolved = resolveSelectInput(ans, choices, defaultValue);
  if (!resolved) {
    console.log(`Invalid choice. Defaulting to ${defaultValue}`);
    return String(defaultValue);
  }
  return resolved;
}

export async function promptSetupTypeSelection(
  context?: CLIContext,
): Promise<'predefined' | 'custom'> {
  const choices = [
    { value: 'predefined', label: 'Use a Predefined Template' },
    { value: 'custom', label: 'Build a Custom Project' },
  ];
  const noColor = context
    ? context.noColor
    : process.env.NO_COLOR === 'true' || process.argv.includes('--no-color');

  if (!supportsKeyboardNavigation()) {
    const welcome = renderWelcomeSection(noColor);
    const panel = renderSetupPanel(0, noColor, true);
    console.log(welcome.join('\n'));
    console.log(panel.join('\n'));

    let promptText = `\nWhat type of setup do you want to create?\n`;
    choices.forEach((choice, idx) => {
      promptText += `  ${idx + 1}. ${choice.label} (${choice.value})\n`;
    });
    promptText += `Enter choice/number [Default: predefined]: `;
    const ans = await askTypedLine(promptText);
    const resolved = resolveSelectInput(ans, choices, 'predefined');
    if (!resolved) {
      console.log(`Invalid choice. Defaulting to predefined`);
      return 'predefined';
    }
    return resolved as 'predefined' | 'custom';
  }

  runCentralizedCleanup();

  const input = process.stdin;
  const output = process.stdout;
  let selectedIndex = 0;
  const wasRaw = input.isRaw === true;
  let settled = false;
  let renderedLines = 0;

  const render = () => {
    if (renderedLines > 0) {
      readline.moveCursor(output, 0, -renderedLines);
      readline.clearScreenDown(output);
    }
    const welcome = renderWelcomeSection(noColor);
    const panel = renderSetupPanel(selectedIndex, noColor, false);
    const lines = [...welcome, ...panel];
    output.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  };

  const confirm = (choice: { value: string; label: string }) => {
    if (renderedLines > 0) {
      readline.moveCursor(output, 0, -renderedLines);
      readline.clearScreenDown(output);
    }
    output.write(`${formatAlignedRow('Setup Type', choice.label)}\n`);
  };

  readline.emitKeypressEvents(input);
  try {
    input.setRawMode?.(true);
  } catch (e) {
    // Intentionally ignored during terminal setup.
  }
  try {
    input.resume();
  } catch (e) {
    // Intentionally ignored during terminal setup.
  }
  if (output.isTTY) {
    output.write('\x1b[?25l');
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (settled) return;
      settled = true;
      unregister();
      input.off('keypress', onKeypress);
      try {
        input.setRawMode?.(wasRaw);
      } catch (e) {
        // Intentionally ignored during terminal cleanup.
      }
      try {
        input.pause();
      } catch (e) {
        // Intentionally ignored during terminal cleanup.
      }
      if (output.isTTY) {
        output.write('\x1b[?25h');
      }
    };

    const unregister = registerPromptCleanup(cleanup);

    const onKeypress = (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        output.write('\n');
        reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
        return;
      }

      if (key.name === 'up' || key.name === 'down') {
        selectedIndex = moveSelection(selectedIndex, key.name, choices.length);
        render();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        const choice = choices[selectedIndex];
        confirm(choice);
        resolve(choice.value as 'predefined' | 'custom');
        return;
      }

      if (str && str >= ' ' && str !== '\x7f') {
        output.write('\x07');
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}

export async function promptTemplateCategory(): Promise<'frontend' | 'backend' | 'fullstack'> {
  const choices = [
    { value: 'frontend', label: 'Frontend' },
    { value: 'backend', label: 'Backend' },
    { value: 'fullstack', label: 'Fullstack (Coming Soon)' },
  ];
  const ans = await promptKeyboardChoiceWithFallback(
    'Select a template category',
    choices,
    'frontend',
  );
  return ans as 'frontend' | 'backend' | 'fullstack';
}

export async function promptTemplateSelection(
  category: 'frontend' | 'backend' = 'frontend',
): Promise<string> {
  const frontendChoices = [
    {
      value: 'portfolio-website',
      label:
        'Portfolio Website - Personal developer/designer portfolio with hero, projects, skills, experience, and contact sections',
    },
    {
      value: 'saas-landing',
      label:
        'SaaS Landing Page - SaaS landing page with hero, features, pricing, testimonials, FAQ, and CTA sections',
    },
    {
      value: 'admin-dashboard',
      label:
        'Admin Dashboard - Sidebar layout, stat cards, tables, charts placeholder, settings page, and responsive layout',
    },
    {
      value: 'agency-business',
      label: 'Agency / Business Website - Services, about, testimonials, contact, and CTA sections',
    },
    {
      value: 'blog-content',
      label:
        'Blog / Content Website - Article listing, featured post, category layout, and blog detail-ready structure',
    },
  ];
  const backendChoices = [
    {
      value: 'express-rest-api',
      label:
        'Express REST API - Modular Express API with controllers, routes, services, middleware, config, health checks, and TypeScript tooling',
    },
    {
      value: 'nestjs-rest-api',
      label:
        'NestJS REST API - Official NestJS-style modules, controllers, services, DTOs, pipes, filters, guards, and health endpoint',
    },
    {
      value: 'fastify-api',
      label:
        'Fastify API - High-performance API with plugins, schemas, route modules, validation, logger integration, and centralized errors',
    },
    {
      value: 'hono-api',
      label:
        'Hono API - Lightweight modern API with route modules, middleware, validation utilities, config layer, and health endpoint',
    },
    {
      value: 'node-auth-api',
      label:
        'Node.js Authentication API - Express JWT auth starter with register/login, password hashing, refresh token mock flow, and protected routes',
    },
  ];
  const choices = category === 'backend' ? backendChoices : frontendChoices;
  return promptKeyboardChoiceWithFallback(
    'Select a predefined template',
    choices,
    category === 'backend' ? 'express-rest-api' : 'portfolio-website',
  );
}

export async function promptStylingSelection(): Promise<'tailwind' | 'mui' | 'none'> {
  const choices = [
    { value: 'tailwind', label: 'Tailwind CSS' },
    { value: 'mui', label: 'Material UI (MUI)' },
    { value: 'none', label: 'None' },
  ];
  const ans = await promptKeyboardChoiceWithFallback('Select styling system', choices, 'tailwind');
  return ans as 'tailwind' | 'mui' | 'none';
}

function getCustomSelectionSummary(config: ProjectConfig): Array<{ label: string; value: string }> {
  const labels: Record<string, string> = {
    'frontend-only': 'Frontend Only',
    'backend-only': 'Backend Only',
    fullstack: 'Fullstack',
    next: 'Next.js',
    'vite-react': 'React (Vite)',
    express: 'Express',
    nest: 'NestJS',
    tailwind: 'Tailwind CSS',
    mui: 'Material UI (MUI)',
    postgres: 'PostgreSQL',
    mongodb: 'MongoDB',
    prisma: 'Prisma',
    mongoose: 'Mongoose',
    none: 'None',
  };
  const selected: Array<[string, string | undefined]> = [
    ['Setup Type', 'Build a Custom Project'],
    ['Project Name', config.projectName],
    ['Mode', config.mode],
    ['Frontend', config.stack.frontend],
    ['Backend', config.stack.backend],
    ['Styling', config.stack.styling],
    ['Database', config.stack.database],
    ['ORM', config.stack.orm],
    ['Package Manager', config.stack.packageManager],
  ];
  return selected
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => ({ label, value: labels[value || ''] || value || '' }));
}

export interface WizardResult {
  setupType: 'predefined' | 'custom';
  projectName: string;
  category?: 'frontend' | 'backend' | 'fullstack';
  templateId?: string;
  styling?: 'tailwind' | 'mui' | 'none';
  confirmed?: boolean;
}

export async function runInitWizardStateController(
  defaultName: string = 'my-structify-app',
  context?: CLIContext,
): Promise<WizardResult> {
  const noColor = context
    ? context.noColor
    : process.env.NO_COLOR === 'true' || process.argv.includes('--no-color');
  const theme = getTheme(noColor);

  if (!supportsKeyboardNavigation()) {
    const setupType = await promptSetupTypeSelection(context);
    const projectName = await promptProjectNameInput(defaultName);
    if (setupType === 'custom') {
      return { setupType, projectName };
    }
    let category: 'frontend' | 'backend' | 'fullstack' = 'frontend';
    let choosingCategory = true;
    while (choosingCategory) {
      category = await promptTemplateCategory();
      if (category === 'fullstack') {
        console.log(`\nComing Soon: Predefined Fullstack templates are not yet available.`);
        const action = await promptKeyboardChoiceWithFallback(
          'What would you like to do?',
          [
            { value: 'category', label: 'Back to Category Selection' },
            { value: 'setup', label: 'Back to Setup Type Choice' },
          ],
          'category',
        );
        if (action === 'setup') {
          return runInitWizardStateController(defaultName, context);
        }
      } else {
        choosingCategory = false;
      }
    }
    const templateId = await promptTemplateSelection(category as 'frontend' | 'backend');
    const styling = category === 'frontend' ? await promptStylingSelection() : 'none';
    return { setupType, projectName, category, templateId, styling, confirmed: true };
  }

  runCentralizedCleanup();

  const input = process.stdin;
  const output = process.stdout;
  const wasRaw = input.isRaw === true;

  let currentStep: 'setup' | 'details' | 'category' | 'template' | 'styling' | 'review' = 'setup';
  let selectedSetupIndex = 0; // 0 for predefined, 1 for custom
  let selectedCategoryIndex = 0; // 0 for frontend, 1 for backend, 2 for fullstack
  let selectedTemplateIndex = 0; // 0 to 4
  let selectedStylingIndex = 0; // 0 to 2
  let selectedConfirmIndex = 0; // 0 for generate, 1 for cancel
  let typedProjectName = '';
  let errorMsg = '';
  let settled = false;

  readline.emitKeypressEvents(input);
  try {
    input.setRawMode?.(true);
  } catch (e) {
    // Intentionally ignored during terminal setup.
  }
  try {
    input.resume();
  } catch (e) {
    // Intentionally ignored during terminal setup.
  }

  let renderedLines = 0;

  const render = () => {
    if (renderedLines > 0) {
      readline.moveCursor(output, 0, -renderedLines);
      readline.clearScreenDown(output);
    }

    let lines: string[] = [];
    if (currentStep === 'setup') {
      const welcome = renderWelcomeSection(noColor);
      const panel = renderSetupPanel(selectedSetupIndex, noColor, false);
      lines = [...welcome, ...panel];
      if (output.isTTY) {
        output.write('\x1b[?25l');
      }
    } else if (currentStep === 'details') {
      const setupTypeStr = selectedSetupIndex === 0 ? 'predefined' : 'custom';
      lines = renderProjectNamePanel(typedProjectName, setupTypeStr, noColor, defaultName);
      if (errorMsg) {
        lines.push(theme.red(`  Error: ${errorMsg}`));
        lines.push('');
      }
      if (output.isTTY) {
        output.write('\x1b[?25h');
      }
    } else if (currentStep === 'category') {
      lines = renderCategoryPanel(
        selectedCategoryIndex,
        typedProjectName || defaultName,
        noColor,
        false,
      );
      if (output.isTTY) {
        output.write('\x1b[?25l');
      }
    } else if (currentStep === 'template') {
      const catStr = selectedCategoryIndex === 0 ? 'frontend' : 'backend';
      lines = renderTemplatePanel(
        selectedTemplateIndex,
        typedProjectName || defaultName,
        catStr,
        noColor,
        false,
      );
      if (output.isTTY) {
        output.write('\x1b[?25l');
      }
    } else if (currentStep === 'styling') {
      const catStr = selectedCategoryIndex === 0 ? 'frontend' : 'backend';
      const templateLabel =
        catStr === 'frontend'
          ? [
              'Portfolio Website',
              'SaaS Landing Page',
              'Admin Dashboard',
              'Agency / Business Website',
              'Blog / Content Website',
            ][selectedTemplateIndex]
          : [
              'Express REST API',
              'NestJS REST API',
              'Fastify API',
              'Hono API',
              'Node.js Authentication API',
            ][selectedTemplateIndex];
      lines = renderStylingPanel(
        selectedStylingIndex,
        typedProjectName || defaultName,
        catStr,
        templateLabel,
        noColor,
        false,
      );
      if (output.isTTY) {
        output.write('\x1b[?25l');
      }
    } else if (currentStep === 'review') {
      const catStr = selectedCategoryIndex === 0 ? 'frontend' : 'backend';
      const finalCategoryLabel = catStr === 'frontend' ? 'Frontend' : 'Backend';
      const templateLabel =
        catStr === 'frontend'
          ? [
              'Portfolio Website',
              'SaaS Landing Page',
              'Admin Dashboard',
              'Agency / Business Website',
              'Blog / Content Website',
            ][selectedTemplateIndex]
          : [
              'Express REST API',
              'NestJS REST API',
              'Fastify API',
              'Hono API',
              'Node.js Authentication API',
            ][selectedTemplateIndex];
      const templateId =
        catStr === 'frontend'
          ? [
              'portfolio-website',
              'saas-landing',
              'admin-dashboard',
              'agency-business',
              'blog-content',
            ][selectedTemplateIndex]
          : ['express-rest-api', 'nestjs-rest-api', 'fastify-api', 'hono-api', 'node-auth-api'][
              selectedTemplateIndex
            ];
      const stylingLabel =
        catStr === 'frontend'
          ? ['Tailwind CSS', 'Material UI (MUI)', 'None'][selectedStylingIndex]
          : 'None';
      const sections = PREDEFINED_TEMPLATES.find((t) => t.id === templateId)?.sections || [
        'Default page skeleton',
      ];
      const targetDir = path.resolve(typedProjectName || defaultName);

      const reviewLines = renderReviewPanel(
        typedProjectName || defaultName,
        targetDir,
        'Predefined Template',
        finalCategoryLabel,
        templateLabel,
        stylingLabel,
        true,
        sections,
        noColor,
      );
      const confirmLines = renderReadyToGeneratePanel(selectedConfirmIndex, noColor, false);
      lines = [
        `  ${theme.cyan('Step 6 of 6')} ${theme.gray('• Review & Generate')} ${theme.gray('(Setup ➔ Details ➔ Category ➔ Template ➔ Styling ➔ Summary)')}`,
        '',
        `  ${theme.gray('Selected Setup:')} ${theme.cyan('Use a Predefined Template')}`,
        `  ${theme.gray('Project Name:')}   ${theme.cyan(typedProjectName || defaultName)}`,
        `  ${theme.gray('Category:')}       ${theme.cyan(finalCategoryLabel)}`,
        `  ${theme.gray('Template:')}       ${theme.cyan(templateLabel)}`,
        ...(catStr === 'frontend'
          ? [`  ${theme.gray('Styling:')}        ${theme.cyan(stylingLabel)}`]
          : []),
        '',
        ...reviewLines,
        '',
        ...confirmLines,
        '',
        `  ${theme.cyan('↑ ↓')} Navigate ${theme.gray('•')} ${theme.cyan('Enter')} Continue ${theme.gray('•')} ${theme.cyan('Esc')} Back ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`,
      ];
      if (output.isTTY) {
        output.write('\x1b[?25l');
      }
    }

    output.write(`${lines.join('\n')}\n`);
    renderedLines = lines.length;
  };

  return new Promise<WizardResult>((resolve, reject) => {
    const cleanup = () => {
      if (settled) return;
      settled = true;
      input.off('keypress', onKeypress);
      try {
        input.setRawMode?.(wasRaw);
      } catch (e) {
        // Intentionally ignored during terminal cleanup.
      }
      try {
        input.pause();
      } catch (e) {
        // Intentionally ignored during terminal cleanup.
      }
      if (output.isTTY) {
        output.write('\x1b[?25h');
      }
    };

    const onKeypress = async (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        output.write('\n');
        reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
        return;
      }

      if (currentStep === 'setup') {
        if (key.name === 'up' || key.name === 'down') {
          selectedSetupIndex = selectedSetupIndex === 0 ? 1 : 0;
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          currentStep = 'details';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }
      } else if (currentStep === 'details') {
        if (key.name === 'escape') {
          currentStep = 'setup';
          errorMsg = '';
          typedProjectName = '';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }

        if (key.name === 'backspace') {
          typedProjectName = typedProjectName.slice(0, -1);
          errorMsg = '';
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          const finalValue = typedProjectName.trim() === '' ? defaultName : typedProjectName.trim();
          const normalized = normalizeProjectNameInput(finalValue);
          if (!normalized.valid) {
            errorMsg = normalized.errors[0] || 'Project name is invalid.';
            render();
            return;
          }

          if (normalized.changed) {
            input.off('keypress', onKeypress);
            try {
              input.setRawMode?.(wasRaw);
            } catch (e) {
              // Intentionally ignored during terminal cleanup.
            }
            if (output.isTTY) {
              output.write('\x1b[?25h');
            }

            if (renderedLines > 0) {
              readline.moveCursor(output, 0, -renderedLines);
              readline.clearScreenDown(output);
              renderedLines = 0;
            }

            const accepted = await promptBooleanConfirmation(
              `Project name "${finalValue}" will be normalized to "${normalized.normalized}". Use this name?`,
              true,
            );

            if (!accepted) {
              try {
                input.setRawMode?.(true);
              } catch (e) {
                // Intentionally ignored during terminal setup.
              }
              try {
                input.resume();
              } catch (e) {
                // Intentionally ignored during terminal setup.
              }
              input.on('keypress', onKeypress);
              render();
              return;
            }

            if (selectedSetupIndex === 1) {
              // custom
              settled = true;
              try {
                input.pause();
              } catch (e) {
                // Intentionally ignored during terminal cleanup.
              }
              resolve({
                setupType: 'custom',
                projectName: normalized.normalized,
              });
              return;
            } else {
              typedProjectName = normalized.normalized;
              currentStep = 'category';
              try {
                input.setRawMode?.(true);
              } catch (e) {
                // Intentionally ignored during terminal setup.
              }
              try {
                input.resume();
              } catch (e) {
                // Intentionally ignored during terminal setup.
              }
              input.on('keypress', onKeypress);
              render();
              return;
            }
          }

          if (selectedSetupIndex === 1) {
            // custom
            cleanup();
            if (renderedLines > 0) {
              readline.moveCursor(output, 0, -renderedLines);
              readline.clearScreenDown(output);
            }
            resolve({
              setupType: 'custom',
              projectName: normalized.normalized,
            });
            return;
          } else {
            typedProjectName = normalized.normalized;
            currentStep = 'category';
            render();
            return;
          }
        }

        if (str && str.length === 1 && str >= ' ' && str !== '\x7f') {
          typedProjectName += str;
          errorMsg = '';
          render();
        }
      } else if (currentStep === 'category') {
        if (key.name === 'escape') {
          currentStep = 'details';
          errorMsg = '';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }

        if (key.name === 'up' || key.name === 'down') {
          selectedCategoryIndex = moveSelection(selectedCategoryIndex, key.name, 3);
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          if (selectedCategoryIndex === 2) {
            input.off('keypress', onKeypress);
            try {
              input.setRawMode?.(wasRaw);
            } catch (e) {
              // Intentionally ignored during terminal cleanup.
            }
            if (output.isTTY) {
              output.write('\x1b[?25h');
            }
            if (renderedLines > 0) {
              readline.moveCursor(output, 0, -renderedLines);
              readline.clearScreenDown(output);
              renderedLines = 0;
            }

            console.log(`\nComing Soon: Predefined Fullstack templates are not yet available.`);
            const action = await promptKeyboardChoiceWithFallback(
              'What would you like to do?',
              [
                { value: 'category', label: 'Back to Category Selection' },
                { value: 'setup', label: 'Back to Setup Type Choice' },
              ],
              'category',
            );

            try {
              input.setRawMode?.(true);
            } catch (e) {
              // Intentionally ignored during terminal setup.
            }
            try {
              input.resume();
            } catch (e) {
              // Intentionally ignored during terminal setup.
            }
            input.on('keypress', onKeypress);

            if (action === 'setup') {
              currentStep = 'setup';
              typedProjectName = '';
            } else {
              currentStep = 'category';
            }
            render();
            return;
          }

          currentStep = 'template';
          selectedTemplateIndex = 0;
          render();
          return;
        }
      } else if (currentStep === 'template') {
        if (key.name === 'escape') {
          currentStep = 'category';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }

        if (key.name === 'up' || key.name === 'down') {
          selectedTemplateIndex = moveSelection(selectedTemplateIndex, key.name, 5);
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          if (selectedCategoryIndex === 1) {
            // Backend: no styling, move straight to review
            currentStep = 'review';
            selectedConfirmIndex = 0;
            render();
            return;
          }

          // Frontend: move to styling system step
          currentStep = 'styling';
          selectedStylingIndex = 0;
          render();
          return;
        }
      } else if (currentStep === 'styling') {
        if (key.name === 'escape') {
          currentStep = 'template';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }

        if (key.name === 'up' || key.name === 'down') {
          selectedStylingIndex = moveSelection(selectedStylingIndex, key.name, 3);
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          currentStep = 'review';
          selectedConfirmIndex = 0;
          render();
          return;
        }
      } else if (currentStep === 'review') {
        if (key.name === 'escape') {
          currentStep = selectedCategoryIndex === 0 ? 'styling' : 'template';
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -renderedLines);
            readline.clearScreenDown(output);
            renderedLines = 0;
          }
          render();
          return;
        }

        if (key.name === 'up' || key.name === 'down') {
          selectedConfirmIndex = selectedConfirmIndex === 0 ? 1 : 0;
          render();
          return;
        }

        if (key.name === 'return' || key.name === 'enter') {
          cleanup();

          if (selectedConfirmIndex === 1) {
            // Cancel selected: clear the entire screen region
            if (renderedLines > 0) {
              readline.moveCursor(output, 0, -renderedLines);
              readline.clearScreenDown(output);
            }
            resolve({
              setupType: 'predefined',
              projectName: typedProjectName,
              confirmed: false,
            });
            return;
          }

          // Generate selected: leave review panel intact, clear only confirmation menu + hints
          const confirmLinesCount = renderReadyToGeneratePanel(
            selectedConfirmIndex,
            noColor,
            false,
          ).length;
          const linesToClear = confirmLinesCount + 3; // blank + confirmLines + blank + hints
          if (renderedLines > 0) {
            readline.moveCursor(output, 0, -linesToClear);
            readline.clearScreenDown(output);
          }

          const finalCategory = selectedCategoryIndex === 0 ? 'frontend' : 'backend';
          const frontendTemplates = [
            'portfolio-website',
            'saas-landing',
            'admin-dashboard',
            'agency-business',
            'blog-content',
          ];
          const backendTemplates = [
            'express-rest-api',
            'nestjs-rest-api',
            'fastify-api',
            'hono-api',
            'node-auth-api',
          ];
          const selectedTemplateVal =
            finalCategory === 'frontend'
              ? frontendTemplates[selectedTemplateIndex]
              : backendTemplates[selectedTemplateIndex];
          const stylingVal: 'tailwind' | 'mui' | 'none' =
            finalCategory === 'frontend'
              ? (['tailwind', 'mui', 'none'] as const)[selectedStylingIndex] || 'none'
              : 'none';

          resolve({
            setupType: 'predefined',
            projectName: typedProjectName,
            category: finalCategory,
            templateId: selectedTemplateVal,
            styling: stylingVal,
            confirmed: true,
          });
          return;
        }
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}
