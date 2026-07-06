export interface PackageManagerAdapter {
  name: string;
  lockfile: string;
  getInstallCommand(): string;
  getAddDependencyCommand(packages: string[], isDev?: boolean): string;
  getRunScriptCommand(script: string): string;
}

export class NpmAdapter implements PackageManagerAdapter {
  public name = 'npm';
  public lockfile = 'package-lock.json';

  public getInstallCommand(): string {
    return 'npm install';
  }

  public getAddDependencyCommand(packages: string[], isDev = false): string {
    const flag = isDev ? '--save-dev' : '--save';
    return `npm install ${flag} ${packages.join(' ')}`;
  }

  public getRunScriptCommand(script: string): string {
    return `npm run ${script}`;
  }
}

export class PnpmAdapter implements PackageManagerAdapter {
  public name = 'pnpm';
  public lockfile = 'pnpm-lock.yaml';

  public getInstallCommand(): string {
    return 'pnpm install';
  }

  public getAddDependencyCommand(packages: string[], isDev = false): string {
    const flag = isDev ? '-D' : '';
    return `pnpm add ${flag} ${packages.join(' ')}`.replace(/\s+/g, ' ').trim();
  }

  public getRunScriptCommand(script: string): string {
    return `pnpm ${script}`;
  }
}

export function getPackageManagerAdapter(name: 'npm' | 'pnpm'): PackageManagerAdapter {
  if (name === 'npm') return new NpmAdapter();
  if (name === 'pnpm') return new PnpmAdapter();
  throw new Error(`Unsupported package manager: "${name}"`);
}
