import fs from 'fs';
import path from 'path';
import { VirtualFileGraph } from './virtual-file-graph.js';

export interface TransactionResult {
  createdFiles: string[];
  createdDirectories: string[];
  backedUpFiles: string[];
  overwrittenFiles: string[];
  skippedFiles: string[];
  failedOperations: string[];
  committed: boolean;
  rolledBack: boolean;
}

export class FileTransactionEngine {
  private result: TransactionResult = {
    createdFiles: [],
    createdDirectories: [],
    backedUpFiles: [],
    overwrittenFiles: [],
    skippedFiles: [],
    failedOperations: [],
    committed: false,
    rolledBack: false,
  };
  private backups = new Map<string, string>();

  public apply(
    graph: VirtualFileGraph,
    targetDir: string,
    options: { force?: boolean } = {},
  ): TransactionResult {
    graph.validate();
    try {
      for (const file of graph.list()) {
        const destination = path.resolve(targetDir, file.targetPath);
        const parentDir = path.dirname(destination);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
          this.result.createdDirectories.push(parentDir);
        }
        if (fs.existsSync(destination)) {
          if (file.conflictPolicy === 'skip') {
            this.result.skippedFiles.push(file.targetPath);
            continue;
          }
          if (file.conflictPolicy === 'error' && !options.force) {
            throw new Error(`File conflict detected: ${file.targetPath}`);
          }
          this.backups.set(destination, fs.readFileSync(destination, 'utf8'));
          this.result.backedUpFiles.push(file.targetPath);
          this.result.overwrittenFiles.push(file.targetPath);
        } else {
          this.result.createdFiles.push(file.targetPath);
        }
        fs.writeFileSync(destination, file.content, 'utf8');
      }
      this.result.committed = true;
      return this.snapshot();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.result.failedOperations.push(message);
      this.rollback(targetDir);
      throw error;
    }
  }

  public rollback(targetDir: string): TransactionResult {
    for (const createdFile of [...this.result.createdFiles].reverse()) {
      const destination = path.resolve(targetDir, createdFile);
      if (fs.existsSync(destination)) {
        fs.unlinkSync(destination);
      }
    }
    for (const [filePath, content] of this.backups.entries()) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    this.result.rolledBack = true;
    return this.snapshot();
  }

  public snapshot(): TransactionResult {
    return {
      ...this.result,
      createdFiles: [...this.result.createdFiles],
      createdDirectories: [...this.result.createdDirectories],
      backedUpFiles: [...this.result.backedUpFiles],
      overwrittenFiles: [...this.result.overwrittenFiles],
      skippedFiles: [...this.result.skippedFiles],
      failedOperations: [...this.result.failedOperations],
    };
  }
}
