import readline from 'readline';
import { ProjectConfig, validateStack, ProjectMode } from '@structify/core';
import { StructifyCLIError } from './error.js';

export interface QuestionMetadata {
  key: string;
  question: string;
  type: 'text' | 'select' | 'boolean';
  choices?: { value: string; label: string }[];
  defaultValue?: string | boolean;
  description?: string;
  dependsOn?: (config: ProjectConfig) => boolean;
  validate?: (input: string) => string | true;
  defaultValueCallback?: (config: ProjectConfig) => string | boolean;
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
          if (!/^[a-z0-9-_.]+$/.test(input)) {
            return 'Project name can only contain lowercase letters, numbers, hyphens, underscores, and dots.';
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
        choices: [
          { value: 'prisma', label: 'Prisma' },
          { value: 'mongoose', label: 'Mongoose' },
          { value: 'none', label: 'None' },
        ],
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
        choices: [
          { value: 'npm', label: 'npm' },
          { value: 'pnpm', label: 'pnpm' },
        ],
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

  async run(): Promise<ProjectConfig> {
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

    let currentIndex = 0;

    try {
      while (true) {
        const activeQuestions = this.questions.filter((q) => !q.dependsOn || q.dependsOn(config));
        if (currentIndex >= activeQuestions.length) {
          break;
        }
        const q = activeQuestions[currentIndex];

        let promptText = `\n[Step ${currentIndex + 1}/${activeQuestions.length}] ${q.question}`;
        const resolvedDefault = q.defaultValueCallback
          ? q.defaultValueCallback(config)
          : q.defaultValue;

        if (q.type === 'select' && q.choices) {
          promptText += '\nOptions:\n';
          q.choices.forEach((choice, idx) => {
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
        } else if (q.type === 'select' && q.choices) {
          const num = parseInt(rawAnswer, 10);
          if (!isNaN(num) && num > 0 && num <= q.choices.length) {
            finalValue = q.choices[num - 1].value;
          } else {
            const found = q.choices.find((c) => c.value === rawAnswer.toLowerCase());
            if (found) {
              finalValue = found.value;
            } else {
              console.log(
                `\x1b[31mInvalid choice. Please choose a number from 1 to ${q.choices.length}.\x1b[0m`,
              );
              continue;
            }
          }
        } else {
          finalValue = rawAnswer;
        }

        if (q.validate) {
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
        } else if (['docker', 'eslint', 'prettier'].includes(q.key)) {
          config.tools[q.key] = finalValue as boolean;
        } else {
          config.stack[q.key] = finalValue as string;
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
      }
    } finally {
      rl.close();
    }

    return config;
  }
}
