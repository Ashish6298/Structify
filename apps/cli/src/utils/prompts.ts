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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Handle Ctrl+C cleanly
    rl.on('SIGINT', () => {
      rl.close();
      console.log('\n');
      throw new StructifyCLIError('USAGE_ERROR', 'User cancelled scaffolding execution.');
    });

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

    try {
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

        let promptText = `\n[Step ${displayedStep}] ${q.question}`;
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

        const rawAnswer: string = await new Promise((resolve) => {
          rl.question(promptText, (answer) => {
            resolve(answer.trim());
          });
        });

        let finalValue: string | boolean | undefined;

        if (rawAnswer === '') {
          finalValue = resolvedDefault;
        } else if (q.type === 'boolean') {
          finalValue = rawAnswer.toLowerCase().startsWith('y') || rawAnswer === 'true';
        } else if (q.type === 'select' && choices) {
          const num = parseInt(rawAnswer, 10);
          if (!isNaN(num) && num > 0 && num <= choices.length) {
            finalValue = choices[num - 1].value;
          } else {
            const found = choices.find((c) => c.value === rawAnswer.toLowerCase());
            if (found) {
              finalValue = found.value;
            } else {
              console.log(
                `\x1b[31mInvalid choice. Please choose a number from 1 to ${choices.length}.\x1b[0m`,
              );
              continue;
            }
          }
        } else {
          finalValue = rawAnswer;
        }

        if (q.key === 'projectName' && typeof finalValue === 'string') {
          const projectName = await this.resolveProjectName(finalValue, rl);
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
    } finally {
      rl.close();
    }

    return config;
  }

  private async resolveProjectName(
    rawName: string,
    rl: readline.Interface,
  ): Promise<string | undefined> {
    const normalized = normalizeProjectNameInput(rawName);
    if (!normalized.valid) {
      console.log(`\x1b[31mError: ${normalized.errors[0]}\x1b[0m`);
      return undefined;
    }

    if (!normalized.changed) {
      return normalized.normalized;
    }

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `Project name "${rawName}" will be normalized to "${normalized.normalized}". Use this name? (y/n) [Default: y]: `,
        (confirmation) => resolve(confirmation.trim().toLowerCase()),
      );
    });

    if (answer === '' || answer.startsWith('y')) {
      return normalized.normalized;
    }

    console.log('Please enter a different project name.');
    return undefined;
  }
}
