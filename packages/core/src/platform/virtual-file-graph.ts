import path from 'path';
import { createHash } from 'crypto';

export type VirtualFileType = 'text' | 'json' | 'config' | 'source' | 'asset';
export type VirtualConflictPolicy = 'error' | 'skip' | 'overwrite';

export interface VirtualFile {
  targetPath: string;
  content: string;
  sourceGenerator: string;
  sourceTemplate: string;
  conflictPolicy: VirtualConflictPolicy;
  dependencies: string[];
  fileType: VirtualFileType;
  hash: string;
  permissions?: string;
  rollback: {
    deleteOnRollback: boolean;
    restoreBackup: boolean;
  };
}

const WINDOWS_RESERVED = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

export class VirtualFileGraph {
  private files = new Map<string, VirtualFile>();

  public addFile(input: Omit<VirtualFile, 'hash'> & { hash?: string }): void {
    const normalizedPath = this.normalizeTargetPath(input.targetPath);
    const hash = input.hash ?? hashContent(input.content);
    const existing = this.files.get(normalizedPath);
    if (existing && existing.hash !== hash) {
      throw new Error(`Content collision detected for virtual file "${normalizedPath}".`);
    }
    if (existing) {
      throw new Error(`Duplicate virtual file path "${normalizedPath}".`);
    }
    this.files.set(normalizedPath, { ...input, targetPath: normalizedPath, hash });
  }

  public list(): VirtualFile[] {
    return [...this.files.values()].sort((left, right) =>
      left.targetPath.localeCompare(right.targetPath),
    );
  }

  public validate(): void {
    for (const file of this.files.values()) {
      this.normalizeTargetPath(file.targetPath);
      for (const dependency of file.dependencies) {
        if (!this.files.has(this.normalizeTargetPath(dependency))) {
          throw new Error(
            `Virtual file "${file.targetPath}" depends on missing file "${dependency}".`,
          );
        }
      }
    }
  }

  private normalizeTargetPath(targetPath: string): string {
    if (targetPath.includes('..')) {
      throw new Error(`Path traversal is not allowed in virtual file path "${targetPath}".`);
    }
    if (targetPath.length > 240) {
      throw new Error(`Virtual file path exceeds supported length: "${targetPath}".`);
    }
    if (/[<>:"|?*]/.test(targetPath)) {
      throw new Error(`Virtual file path contains invalid characters: "${targetPath}".`);
    }
    const normalized = path.posix.normalize(targetPath.replace(/\\/g, '/'));
    const basename = path.posix.basename(normalized).split('.')[0].toLowerCase();
    if (WINDOWS_RESERVED.has(basename)) {
      throw new Error(`Virtual file path uses reserved Windows filename: "${targetPath}".`);
    }
    return normalized;
  }
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
