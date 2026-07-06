import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatorRegistry,
  dependencyRegistry,
  registerBuiltIns,
  Registry,
  RegistryItem,
} from './index.js';

describe('Registry System', () => {
  beforeEach(() => {
    registerBuiltIns();
  });

  it('should prevent duplicate ID registration', () => {
    const reg = new Registry<RegistryItem>();
    reg.register({ id: 'test', name: 'Test', version: '1.0.0', description: 'Test desc' });
    expect(() => {
      reg.register({
        id: 'test',
        name: 'Test Duplicate',
        version: '1.0.0',
        description: 'Test desc',
      });
    }).toThrow('Duplicate Registry Item ID detected: "test"');
  });

  it('should validate missing ID/name/version', () => {
    const reg = new Registry<RegistryItem>();
    expect(() => {
      reg.register({ id: '', name: 'Test', version: '1.0.0', description: 'Test desc' });
    }).toThrow('Registry Item must have a non-empty string ID.');
  });

  it('should list all registered items', () => {
    const items = generatorRegistry.list();
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((i) => i.id)).toContain('gen-next');
  });

  it('should handle dependency registry deduplication and conflicts', () => {
    dependencyRegistry.clear();
    dependencyRegistry.register({
      packageName: 'foo',
      versionRange: '^1.0.0',
      dependencyType: 'prod',
      supportedPackageManagers: ['npm'],
      installScope: 'root',
      reason: 'test',
    });
    dependencyRegistry.register({
      packageName: 'foo',
      versionRange: '^1.0.0',
      dependencyType: 'prod',
      supportedPackageManagers: ['npm'],
      installScope: 'root',
      reason: 'test duplicate',
    });

    const { resolved, conflicts } = dependencyRegistry.deduplicateAndResolveConflicts();
    expect(resolved.length).toBe(1);
    expect(conflicts.length).toBe(0);

    dependencyRegistry.register({
      packageName: 'foo',
      versionRange: '^2.0.0',
      dependencyType: 'prod',
      supportedPackageManagers: ['npm'],
      installScope: 'root',
      reason: 'conflict version',
    });

    const res2 = dependencyRegistry.deduplicateAndResolveConflicts();
    expect(res2.conflicts.length).toBe(1);
    expect(res2.conflicts[0].packageName).toBe('foo');
  });
});
