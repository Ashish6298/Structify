import readline from 'readline';
import {
  ProjectConfig,
  validateProjectName,
  validateStack,
  ProjectMode,
  DatabaseOption,
  OrmOption,
} from '@structify/core';
import { StructifyCLIError } from './error.js';

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
}

interface PromptChoice {
  value: string;
  label: string;
}

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

  if (keyName === 'up') {
    return (currentIndex - 1 + choiceCount) % choiceCount;
  }

  if (keyName === 'down') {
    return (currentIndex + 1) % choiceCount;
  }

  return currentIndex;
}

class StablePromptRenderer {
  private blockLines = 0;
  private headerRendered = false;

  constructor(
    private output: NodeJS.WriteStream,
    private message: string,
    private choices: PromptChoice[],
  ) {}

  render(selectedIndex: number, typedInput: string): void {
    if (!this.headerRendered) {
      this.output.write(`${this.message}\n`);
      this.output.write('Use Up/Down and Enter, or type a number/value and press Enter.\n');
      this.headerRendered = true;
    } else if (this.blockLines > 0) {
      readline.moveCursor(this.output, 0, -this.blockLines);
      readline.clearScreenDown(this.output);
    }

    const block = this.createOptionBlock(selectedIndex, typedInput);
    this.output.write(`${block.join('\n')}\n`);
    this.blockLines = block.length;
  }

  finish(): void {
    this.output.write('\n');
  }

  private createOptionBlock(selectedIndex: number, typedInput: string): string[] {
    const indexWidth = String(this.choices.length).length;
    return [
      ...this.choices.map((choice, index) => {
        const marker = index === selectedIndex ? '>' : ' ';
        const number = String(index + 1).padStart(indexWidth, ' ');
        const selected = index === selectedIndex ? ' [selected]' : '';
        return `${marker} ${number}. ${choice.label} (${choice.value})${selected}`;
      }),
      `Input: ${typedInput}`,
    ];
  }
}

async function askTypedLine(promptText: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      rl.removeAllListeners('SIGINT');
      rl.close();
    };

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
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const defaultIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === String(defaultValue)),
  );
  let selectedIndex = defaultIndex;
  let typedInput = '';
  const wasRaw = input.isRaw === true;
  const renderer = new StablePromptRenderer(output, message, choices);
  let settled = false;

  readline.emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.resume();
  output.write('\x1b[?25l');

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (settled) {
        return;
      }
      settled = true;
      input.off('keypress', onKeypress);
      input.setRawMode?.(wasRaw);
      output.write('\x1b[?25h');
    };

    const render = () => {
      renderer.render(selectedIndex, typedInput);
    };

    const finish = (value: string) => {
      cleanup();
      renderer.finish();
      resolve(value);
    };

    const onKeypress = (str: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        renderer.finish();
        reject(new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.'));
        return;
      }

      if (key.name === 'up' || key.name === 'down') {
        selectedIndex = moveSelection(selectedIndex, key.name, choices.length);
        typedInput = '';
        render();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        if (typedInput.trim() === '') {
          finish(choices[selectedIndex]?.value || String(defaultValue));
          return;
        }

        const resolved = resolveSelectInput(typedInput, choices, defaultValue);
        if (resolved) {
          finish(resolved);
          return;
        }

        if (isBooleanChoiceSet(choices) && /^(y|n|true|false)$/i.test(typedInput.trim())) {
          finish(String(resolveBooleanInput(typedInput, defaultValue)));
          return;
        }

        output.write('\x07');
        typedInput = '';
        render();
        return;
      }

      if (key.name === 'backspace') {
        typedInput = typedInput.slice(0, -1);
        render();
        return;
      }

      if (str && str >= ' ' && str !== '\x7f') {
        typedInput += str;
        render();
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
      if (
        supportsKeyboardNavigation() &&
        ((q.type === 'select' && choices) || q.type === 'boolean')
      ) {
        rawAnswer = await promptKeyboardChoice(
          promptHeading,
          q.type === 'boolean'
            ? [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]
            : choices || [],
          q.type === 'boolean' ? String(Boolean(resolvedDefault)) : resolvedDefault,
        );
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
