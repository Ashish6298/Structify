import { NormalizedProjectConfig, PresetManifestMetadata } from '../types/index.js';
import { hashStable } from '../manifest/index.js';

export type ProjectGraphNodeType =
  | 'app'
  | 'package'
  | 'route'
  | 'page'
  | 'api-endpoint'
  | 'component'
  | 'layout'
  | 'service'
  | 'database-client'
  | 'model'
  | 'config-file'
  | 'script'
  | 'tooling';

export interface ProjectGraphNode {
  id: string;
  type: ProjectGraphNodeType;
  name: string;
  path?: string;
  sourceGenerator: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ProjectGraphEdge {
  from: string;
  to: string;
  relation: 'contains' | 'imports' | 'uses' | 'configures' | 'runs';
}

export interface ProjectGraph {
  version: '1.0.0';
  projectName: string;
  stackHash: string;
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  summary: Record<ProjectGraphNodeType, number>;
  preset?: PresetManifestMetadata;
}

export class ProjectGraphBuilder {
  private nodes = new Map<string, ProjectGraphNode>();
  private edges: ProjectGraphEdge[] = [];

  public addNode(node: ProjectGraphNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: ProjectGraphEdge): void {
    this.edges.push(edge);
  }

  public build(config: NormalizedProjectConfig): ProjectGraph {
    const nodes = [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
    const summary = Object.fromEntries(
      [
        'app',
        'package',
        'route',
        'page',
        'api-endpoint',
        'component',
        'layout',
        'service',
        'database-client',
        'model',
        'config-file',
        'script',
        'tooling',
      ].map((type) => [type, nodes.filter((node) => node.type === type).length]),
    ) as Record<ProjectGraphNodeType, number>;

    return {
      version: '1.0.0',
      projectName: config.projectName,
      stackHash: hashStable(config.stack),
      nodes,
      edges: [...this.edges].sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)),
      summary,
      preset: config.preset,
    };
  }
}
