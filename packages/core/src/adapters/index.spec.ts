import { describe, it, expect } from 'vitest';
import { osAdapter } from './os.js';
import { getPackageManagerAdapter } from './package-manager.js';

describe('Adapters Layer', () => {
  describe('OSAdapter', () => {
    it('should format shell commands correctly', () => {
      const formatted = osAdapter.formatShellCommand('git', ['commit', '-m', 'hello world']);
      expect(formatted).toBe('git commit -m "hello world"');
    });

    it('should normalize paths and prevent traversal safety breaches', () => {
      expect(osAdapter.isPathSafe('src/app')).toBe(true);
      expect(osAdapter.isPathSafe('src/../../etc')).toBe(false);
    });
  });

  describe('PackageManagerAdapter', () => {
    it('should generate pnpm commands correctly', () => {
      const pnpm = getPackageManagerAdapter('pnpm');
      expect(pnpm.getInstallCommand()).toBe('pnpm install');
      expect(pnpm.getAddDependencyCommand(['next', 'react'])).toBe('pnpm add next react');
      expect(pnpm.getAddDependencyCommand(['eslint'], true)).toBe('pnpm add -D eslint');
    });

    it('should generate npm commands correctly', () => {
      const npm = getPackageManagerAdapter('npm');
      expect(npm.getInstallCommand()).toBe('npm install');
      expect(npm.getAddDependencyCommand(['next', 'react'])).toBe('npm install --save next react');
      expect(npm.getAddDependencyCommand(['eslint'], true)).toBe('npm install --save-dev eslint');
    });
  });
});
