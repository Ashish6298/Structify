import * as childProcess from 'child_process';

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
  public constructor(private spawnCommand = childProcess.spawn) {}

  public async execute(
    command: string,
    args: string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const parsed = args.length > 0 ? { command, args } : splitCommandLine(command);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let settled = false;
      const child = this.spawnCommand(resolveWindowsCommand(parsed.command), parsed.args, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      const timeout =
        options.timeout && options.timeout > 0
          ? setTimeout(() => {
              child.kill();
            }, options.timeout)
          : undefined;

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        resolve({
          code: 1,
          stdout,
          stderr: stderr || error.message || 'Command execution failed',
        });
      });
      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        resolve({ code: code ?? 0, stdout, stderr });
      });
    });
  }
}

function splitCommandLine(commandLine: string): { command: string; args: string[] } {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;

  for (let index = 0; index < commandLine.length; index += 1) {
    const char = commandLine[index];
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = undefined;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  const [parsedCommand = commandLine, ...parsedArgs] = tokens;
  return { command: parsedCommand, args: parsedArgs };
}

function resolveWindowsCommand(command: string): string {
  if (process.platform !== 'win32') {
    return command;
  }

  const lower = command.toLowerCase();
  if (lower === 'npm' || lower === 'npx' || lower === 'pnpm' || lower === 'yarn') {
    return `${command}.cmd`;
  }

  return command;
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
