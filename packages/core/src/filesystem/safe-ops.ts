import fs from 'fs';
import path from 'path';

export type ConflictPolicy = 'overwrite' | 'skip' | 'error';

export interface FileOpOptions {
  dryRun?: boolean;
  conflictPolicy?: ConflictPolicy;
}

export class SafeFileOperationManager {
  private dryRun: boolean;
  private conflictPolicy: ConflictPolicy;
  private backups = new Map<string, string>();

  constructor(options: FileOpOptions = {}) {
    this.dryRun = options.dryRun ?? false;
    this.conflictPolicy = options.conflictPolicy ?? 'error';
  }

  public normalizePath(p: string): string {
    return path.normalize(p).replace(/\\/g, '/');
  }

  public checkExistence(p: string): boolean {
    return fs.existsSync(p);
  }

  public readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  public createDirectory(dirPath: string): void {
    const norm = this.normalizePath(dirPath);
    if (this.dryRun) return;
    if (!fs.existsSync(norm)) {
      fs.mkdirSync(norm, { recursive: true });
    }
  }

  public writeFile(filePath: string, content: string): void {
    const norm = this.normalizePath(filePath);
    const exists = fs.existsSync(norm);

    if (exists) {
      if (this.conflictPolicy === 'error') {
        throw new Error(`File conflict detected: "${norm}" already exists.`);
      }
      if (this.conflictPolicy === 'skip') {
        return;
      }
    }

    if (this.dryRun) return;

    const parentDir = path.dirname(norm);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(norm, content, 'utf8');
  }

  public appendFile(filePath: string, content: string): void {
    const norm = this.normalizePath(filePath);
    if (this.dryRun) return;
    fs.appendFileSync(norm, content, 'utf8');
  }

  public copyFile(src: string, dest: string): void {
    const normSrc = this.normalizePath(src);
    const normDest = this.normalizePath(dest);
    const exists = fs.existsSync(normDest);

    if (exists) {
      if (this.conflictPolicy === 'error') {
        throw new Error(
          `File conflict detected at copy destination: "${normDest}" already exists.`,
        );
      }
      if (this.conflictPolicy === 'skip') {
        return;
      }
    }

    if (this.dryRun) return;

    const parentDir = path.dirname(normDest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.copyFileSync(normSrc, normDest);
  }

  public deleteFile(filePath: string): void {
    const norm = this.normalizePath(filePath);
    if (this.dryRun) return;
    if (fs.existsSync(norm)) {
      fs.unlinkSync(norm);
    }
  }

  public backupFile(filePath: string): void {
    const norm = this.normalizePath(filePath);
    if (fs.existsSync(norm)) {
      const content = fs.readFileSync(norm, 'utf8');
      this.backups.set(norm, content);
    }
  }

  public restoreBackup(filePath: string): void {
    const norm = this.normalizePath(filePath);
    const original = this.backups.get(norm);
    if (original !== undefined) {
      if (this.dryRun) return;
      fs.writeFileSync(norm, original, 'utf8');
    }
  }
}
