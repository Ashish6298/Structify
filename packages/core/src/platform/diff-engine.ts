import fs from 'fs';
import path from 'path';
import { VirtualFileGraph, VirtualFile, hashContent } from './virtual-file-graph.js';

export type DiffChangeType =
  | 'create'
  | 'overwrite'
  | 'skip'
  | 'conflict'
  | 'unchanged'
  | 'delete-not-needed'
  | 'backup-required';

export interface DiffEntry {
  path: string;
  type: DiffChangeType;
  reason: string;
  existingHash?: string;
  nextHash: string;
}

export interface ProjectDiff {
  entries: DiffEntry[];
  summary: Record<DiffChangeType, number>;
  hasConflicts: boolean;
}

export class ProjectDiffEngine {
  public static compare(graph: VirtualFileGraph, targetDir: string): ProjectDiff {
    const entries = graph.list().map((file) => this.compareFile(file, targetDir));
    const summary = {
      create: 0,
      overwrite: 0,
      skip: 0,
      conflict: 0,
      unchanged: 0,
      'delete-not-needed': 0,
      'backup-required': 0,
    } satisfies Record<DiffChangeType, number>;
    for (const entry of entries) {
      summary[entry.type] += 1;
    }
    return {
      entries,
      summary,
      hasConflicts: summary.conflict > 0,
    };
  }

  private static compareFile(file: VirtualFile, targetDir: string): DiffEntry {
    const destination = path.resolve(targetDir, file.targetPath);
    if (!fs.existsSync(destination)) {
      return {
        path: file.targetPath,
        type: 'create',
        reason: 'File does not exist.',
        nextHash: file.hash,
      };
    }
    const existingHash = hashContent(fs.readFileSync(destination, 'utf8'));
    if (existingHash === file.hash) {
      return {
        path: file.targetPath,
        type: 'unchanged',
        reason: 'Existing content matches generated content.',
        existingHash,
        nextHash: file.hash,
      };
    }
    if (file.conflictPolicy === 'skip') {
      return {
        path: file.targetPath,
        type: 'skip',
        reason: 'File exists and conflict policy is skip.',
        existingHash,
        nextHash: file.hash,
      };
    }
    if (file.conflictPolicy === 'overwrite') {
      return {
        path: file.targetPath,
        type: 'backup-required',
        reason: 'File exists and will be backed up before overwrite.',
        existingHash,
        nextHash: file.hash,
      };
    }
    return {
      path: file.targetPath,
      type: 'conflict',
      reason: 'File exists and conflict policy is error.',
      existingHash,
      nextHash: file.hash,
    };
  }
}
