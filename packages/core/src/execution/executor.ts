import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  retryPolicy?: { retries: number; delay: number };
  dryRun?: boolean;
}

export interface CommandExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommandExecutor {
  execute(
    command: string,
    args: string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult>;
}

export class DryRunCommandExecutor implements CommandExecutor {
  public async execute(
    command: string,
    args: string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const formatted = `${command} ${args.join(' ')}`;
    return {
      code: 0,
      stdout: `[DRY-RUN] Executed: ${formatted} (cwd: ${options.cwd || 'current'})`,
      stderr: '',
    };
  }
}

export class DefaultCommandExecutor implements CommandExecutor {
  public async execute(
    command: string,
    args: string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const fullCmd = `${command} ${args.join(' ')}`.trim();
    try {
      const { stdout, stderr } = await execAsync(fullCmd, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : process.env,
        timeout: options.timeout,
      });
      return { code: 0, stdout, stderr };
    } catch (e: unknown) {
      const error = e as Partial<CommandExecutionResult> & { message?: string };
      return {
        code: error.code ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? error.message ?? 'Command execution failed',
      };
    }
  }
}

export class MockCommandExecutor implements CommandExecutor {
  public calls: { command: string; args: string[]; options?: CommandExecutionOptions }[] = [];
  public mockResponse: CommandExecutionResult = { code: 0, stdout: 'mock success', stderr: '' };

  public async execute(
    command: string,
    args: string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult> {
    this.calls.push({ command, args, options });
    return this.mockResponse;
  }
}
