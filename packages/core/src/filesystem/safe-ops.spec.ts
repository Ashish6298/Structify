import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafeFileOperationManager } from './safe-ops.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Safe File Operation Manager', () => {
  let tempDir: string;
  let manager: SafeFileOperationManager;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `structify-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    manager = new SafeFileOperationManager({ conflictPolicy: 'error' });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create directories and write files successfully', () => {
    const testFile = path.join(tempDir, 'sub/test.txt');
    manager.writeFile(testFile, 'hello');
    expect(fs.readFileSync(testFile, 'utf8')).toBe('hello');
  });

  it('should prevent overwrites when conflict policy is error', () => {
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'existing', 'utf8');

    expect(() => {
      manager.writeFile(testFile, 'new content');
    }).toThrow('File conflict detected');
  });

  it('should backup and restore files correctly', () => {
    const testFile = path.join(tempDir, 'backup.txt');
    fs.writeFileSync(testFile, 'original', 'utf8');

    manager.backupFile(testFile);
    fs.writeFileSync(testFile, 'mutated', 'utf8');

    manager.restoreBackup(testFile);
    expect(fs.readFileSync(testFile, 'utf8')).toBe('original');
  });
});
