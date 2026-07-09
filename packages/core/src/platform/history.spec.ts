import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { readHistory, appendHistoryEntry } from './history.js';

describe('Project History Module', () => {
  const tempDir = path.resolve('./temp-history-test');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reads empty history if history.json does not exist', () => {
    const history = readHistory(tempDir);
    expect(history).toEqual([]);
  });

  it('correctly appends, writes, and reads history entries', () => {
    const entry1 = appendHistoryEntry(tempDir, {
      operation: 'init',
      status: 'success',
      duration: 150,
      filesChanged: ['package.json'],
      summary: 'Project Created',
    });

    expect(entry1.id).toBeDefined();
    expect(entry1.timestamp).toBeDefined();
    expect(entry1.version).toBe('1.0.1');
    expect(entry1.summary).toBe('Project Created');

    const history = readHistory(tempDir);
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(entry1.id);

    // Append second entry
    appendHistoryEntry(tempDir, {
      operation: 'add',
      status: 'success',
      duration: 40,
      filesChanged: ['lib/auth.ts'],
      summary: 'Added Better Auth',
    });

    const updatedHistory = readHistory(tempDir);
    expect(updatedHistory.length).toBe(2);
    expect(updatedHistory[1].summary).toBe('Added Better Auth');
  });
});
