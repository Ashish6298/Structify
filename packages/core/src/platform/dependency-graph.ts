export type DependencyKind = 'runtime' | 'dev' | 'peer' | 'optional';
export type SupportedInstallPackageManager = 'npm' | 'pnpm';

export interface DependencySource {
  generatorId: string;
  reason: string;
}

export interface PeerDependencyMetadata {
  name: string;
  version: string;
  optional?: boolean;
}

export interface DependencyNode {
  name: string;
  version: string;
  type: DependencyKind;
  target: string;
  packageManager?: SupportedInstallPackageManager;
  source?: DependencySource;
  peers?: Record<string, string>;
  peerDependencies?: PeerDependencyMetadata[];
}

export interface DependencyDiagnostic {
  code: 'VERSION_CONFLICT' | 'PEER_MISSING' | 'TYPE_CONFLICT' | 'TARGET_CONFLICT';
  severity: 'warning' | 'error';
  packageName: string;
  message: string;
  sources: DependencySource[];
}

export interface ResolvedDependency {
  name: string;
  version: string;
  type: DependencyKind;
  target: string;
  sources: DependencySource[];
}

export interface DependencyGraphResult {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  resolved: ResolvedDependency[];
  diagnostics: DependencyDiagnostic[];
  conflicts: string[];
  installPlan: string[];
  explanations: Record<string, string[]>;
}

export class DependencyGraph {
  private nodes: DependencyNode[] = [];

  public add(node: DependencyNode): void {
    this.nodes.push({
      ...node,
      packageManager: node.packageManager ?? 'npm',
      source: node.source ?? { generatorId: 'unknown', reason: 'No source metadata supplied' },
    });
  }

  public list(): DependencyNode[] {
    return [...this.nodes].sort((a, b) =>
      `${a.target}:${a.name}`.localeCompare(`${b.target}:${b.name}`),
    );
  }

  public resolve(packageManager: SupportedInstallPackageManager = 'npm'): DependencyGraphResult {
    const grouped = new Map<string, DependencyNode[]>();
    for (const node of this.nodes.filter(
      (candidate) => candidate.packageManager === packageManager,
    )) {
      const key = `${node.target}:${node.name}`;
      grouped.set(key, [...(grouped.get(key) ?? []), node]);
    }

    const diagnostics: DependencyDiagnostic[] = [];
    const resolved: ResolvedDependency[] = [];
    const explanations: Record<string, string[]> = {};

    for (const [key, nodes] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const versions = [...new Set(nodes.map((node) => node.version))].sort();
      const types = [...new Set(nodes.map((node) => node.type))].sort();
      const sources = nodes
        .map((node) => node.source)
        .filter((source): source is DependencySource => Boolean(source));
      const packageName = nodes[0]?.name ?? key;
      if (versions.length > 1) {
        diagnostics.push({
          code: 'VERSION_CONFLICT',
          severity: 'error',
          packageName,
          message: `Version conflict for ${packageName}: ${versions.join(' vs ')}`,
          sources,
        });
      }
      if (types.includes('runtime') && types.includes('dev')) {
        diagnostics.push({
          code: 'TYPE_CONFLICT',
          severity: 'warning',
          packageName,
          message: `${packageName} is requested as both runtime and dev dependency; runtime wins.`,
          sources,
        });
      }

      const winner = [...nodes].sort((a, b) => kindRank(a.type) - kindRank(b.type))[0];
      if (!winner) continue;
      resolved.push({
        name: winner.name,
        version: versions[0] ?? winner.version,
        type: types.includes('runtime') ? 'runtime' : winner.type,
        target: winner.target,
        sources,
      });
      explanations[winner.name] = sources.map(
        (source) => `${source.generatorId}: ${source.reason}`,
      );
    }

    for (const node of this.nodes) {
      const peerEntries: PeerDependencyMetadata[] = [
        ...Object.entries(node.peers ?? {}).map(([name, version]) => ({ name, version })),
        ...(node.peerDependencies ?? []),
      ];
      for (const peer of peerEntries) {
        if (peer.optional) continue;
        if (!this.nodes.some((candidate) => candidate.name === peer.name)) {
          diagnostics.push({
            code: 'PEER_MISSING',
            severity: 'error',
            packageName: node.name,
            message: `Missing peer dependency ${peer.name}@${peer.version} for ${node.name}`,
            sources: node.source ? [node.source] : [],
          });
        }
      }
    }

    const dependencies = entriesFor(resolved, 'runtime');
    const devDependencies = entriesFor(resolved, 'dev');
    const peerDependencies = entriesFor(resolved, 'peer');
    const optionalDependencies = entriesFor(resolved, 'optional');
    const installPlan = buildInstallPlan(
      packageManager,
      dependencies,
      devDependencies,
      optionalDependencies,
    );

    return {
      dependencies,
      devDependencies,
      peerDependencies,
      optionalDependencies,
      resolved,
      diagnostics,
      conflicts: diagnostics
        .filter((diagnostic) => diagnostic.severity === 'error')
        .map((diagnostic) => diagnostic.message),
      installPlan,
      explanations,
    };
  }
}

function kindRank(kind: DependencyKind): number {
  return { runtime: 0, dev: 1, peer: 2, optional: 3 }[kind];
}

function entriesFor(resolved: ResolvedDependency[], kind: DependencyKind): Record<string, string> {
  return Object.fromEntries(
    resolved
      .filter((dependency) => dependency.type === kind)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((dependency) => [dependency.name, dependency.version]),
  );
}

function buildInstallPlan(
  packageManager: SupportedInstallPackageManager,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  optionalDependencies: Record<string, string>,
): string[] {
  const command = packageManager;
  const runtime = Object.entries(dependencies).map(([name, version]) => `${name}@${version}`);
  const dev = Object.entries(devDependencies).map(([name, version]) => `${name}@${version}`);
  const optional = Object.entries(optionalDependencies).map(
    ([name, version]) => `${name}@${version}`,
  );
  return [
    ...(runtime.length > 0 ? [`${command} install ${runtime.join(' ')}`] : []),
    ...(dev.length > 0 ? [`${command} install --save-dev ${dev.join(' ')}`] : []),
    ...(optional.length > 0 ? [`${command} install --save-optional ${optional.join(' ')}`] : []),
  ];
}
