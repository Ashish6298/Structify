import { analyzeProject } from '../intelligence/engine.js';
import { ArchitectureViewModel } from './types.js';
import { createArchitectureView } from './view.js';

export interface ArchitectureNodeDetails {
  name: string;
  path: string;
  type: string;
  importance: string;
  size: number | null;
  lastModified: string | null;
  parent: string | null;
  children: string[];
  metadata: Record<string, unknown>;
}

export interface ArchitectureExplorerModel {
  title: string;
  generatedAt: string;
  projectType: string;
  views: {
    architectural: ArchitectureViewModel;
    complete: ArchitectureViewModel;
  };
  details: Record<string, ArchitectureNodeDetails>;
}

export function createArchitectureExplorerModel(projectPath: string): ArchitectureExplorerModel {
  return createArchitectureExplorerModelFromAnalysis(analyzeProject(projectPath));
}

export function createArchitectureExplorerModelFromAnalysis(
  analysis: ReturnType<typeof analyzeProject>,
): ArchitectureExplorerModel {
  const architectural = createArchitectureView(analysis, 'architectural');
  const complete = createArchitectureView(analysis, 'complete');

  return {
    title: analysis.project.name,
    generatedAt: analysis.generatedAt,
    projectType: analysis.project.type,
    views: {
      architectural,
      complete,
    },
    details: Object.fromEntries(
      analysis.files.map((file) => [
        file.path,
        {
          name: file.name,
          path: file.path,
          type: file.type,
          importance: file.importance,
          size: typeof file.metadata['size'] === 'number' ? (file.metadata['size'] as number) : null,
          lastModified:
            typeof file.metadata['lastModified'] === 'string'
              ? (file.metadata['lastModified'] as string)
              : null,
          parent: file.parent,
          children: file.children,
          metadata: file.metadata,
        } satisfies ArchitectureNodeDetails,
      ]),
    ),
  };
}
