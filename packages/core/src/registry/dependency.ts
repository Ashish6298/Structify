export interface DependencyEntry {
  packageName: string;
  versionRange: string;
  dependencyType: 'prod' | 'dev' | 'peer';
  supportedPackageManagers: ('npm' | 'pnpm')[];
  installScope: 'workspace' | 'root';
  targetWorkspace?: string;
  reason: string;
  relatedGenerator?: string;
  peerDependencies?: Record<string, string>;
}

export class DependencyRegistry {
  private dependencies = new Map<string, DependencyEntry[]>();

  public register(dep: DependencyEntry): void {
    if (!dep.packageName || !dep.versionRange) {
      throw new Error('Dependency must specify packageName and versionRange.');
    }
    const list = this.dependencies.get(dep.packageName) || [];
    list.push(dep);
    this.dependencies.set(dep.packageName, list);
  }

  public list(): DependencyEntry[] {
    return Array.from(this.dependencies.values()).flat();
  }

  public clear(): void {
    this.dependencies.clear();
  }

  public deduplicateAndResolveConflicts(): {
    resolved: DependencyEntry[];
    conflicts: { packageName: string; versions: string[]; reasons: string[] }[];
  } {
    const resolved: DependencyEntry[] = [];
    const conflicts: { packageName: string; versions: string[]; reasons: string[] }[] = [];

    for (const [packageName, entries] of this.dependencies.entries()) {
      if (entries.length === 0) continue;
      const versions = Array.from(new Set(entries.map((e) => e.versionRange)));
      if (versions.length > 1) {
        conflicts.push({
          packageName,
          versions,
          reasons: entries.map((e) => `${e.versionRange} (${e.reason})`),
        });
      } else {
        resolved.push(entries[0]);
      }
    }

    return { resolved, conflicts };
  }

  public groupByPackageManagerAndWorkspace(
    packageManager: 'npm' | 'pnpm',
  ): Record<string, { prod: string[]; dev: string[] }> {
    const { resolved } = this.deduplicateAndResolveConflicts();
    const result: Record<string, { prod: string[]; dev: string[] }> = {};

    for (const dep of resolved) {
      if (!dep.supportedPackageManagers.includes(packageManager)) continue;
      const target = dep.targetWorkspace || 'root';
      if (!result[target]) {
        result[target] = { prod: [], dev: [] };
      }
      const itemStr = `${dep.packageName}@${dep.versionRange}`;
      if (dep.dependencyType === 'prod') {
        result[target].prod.push(itemStr);
      } else {
        result[target].dev.push(itemStr);
      }
    }

    return result;
  }
}

export const dependencyRegistry = new DependencyRegistry();
