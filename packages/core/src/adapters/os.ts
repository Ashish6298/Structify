import os from 'os';
import path from 'path';

export interface OSAdapter {
  platform: string;
  isWindows(): boolean;
  normalizePath(p: string): string;
  getExecutableExtension(name: string): string;
  formatShellCommand(cmd: string, args: string[]): string;
  getHomeDir(): string;
  getTempDir(): string;
  getNewline(): string;
  isPathSafe(p: string): boolean;
}

export class DefaultOSAdapter implements OSAdapter {
  public platform = os.platform();

  public isWindows(): boolean {
    return this.platform === 'win32';
  }

  public normalizePath(p: string): string {
    return path.normalize(p).replace(/\\/g, '/');
  }

  public getExecutableExtension(name: string): string {
    return this.isWindows() ? `${name}.exe` : name;
  }

  public formatShellCommand(cmd: string, args: string[]): string {
    const formattedArgs = args.map((arg) => {
      if (arg.includes(' ') || arg.includes('"')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
    return `${cmd} ${formattedArgs.join(' ')}`.trim();
  }

  public getHomeDir(): string {
    return os.homedir();
  }

  public getTempDir(): string {
    return os.tmpdir();
  }

  public getNewline(): string {
    return this.isWindows() ? '\r\n' : '\n';
  }

  public isPathSafe(p: string): boolean {
    const normalized = this.normalizePath(p);
    return !normalized.split('/').includes('..');
  }
}

export const osAdapter = new DefaultOSAdapter();
