import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeProject } from './engine.js';
import { analyzeDependencies } from './dependencies.js';

const tempDirs: string[] = [];

describe('Dependency Intelligence Subsystem', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects outdated, deprecated, unused, duplicate, missing, and peer dependency issues', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-deps-'));
    tempDirs.push(projectDir);

    // Write a mock workspace structure
    writeProject(projectDir, {
      'package.json': JSON.stringify({
        name: 'test-project',
        dependencies: {
          react: '^18.2.0', // Outdated (latest is 19.0.0) -> SAFE/BREAKING
          request: '^2.88.2', // Deprecated -> MIGRATION REQUIRED
          lodash: '^4.17.21', // Unused (never imported in source) -> MINOR REVIEW
          'react-dom': '^18.2.0', // Requires react@^19.0.0 in catalog -> peer-issue
        },
      }),
      'src/index.ts': `
        import react from 'react';
        import express from 'express'; // Missing dependency!
        console.log(react);
      `,
      'package-lock.json': JSON.stringify({
        name: 'test-project',
        lockfileVersion: 2,
        packages: {
          'node_modules/react': { version: '18.2.0' },
          'node_modules/request': { version: '2.88.2' },
          'node_modules/lodash': { version: '4.17.21' },
          'node_modules/react-dom': { version: '18.2.0' },
        },
      }),
    });

    const analysis = analyzeProject(projectDir);
    const report = analyzeDependencies(projectDir, analysis);

    expect(report.installedCount).toBe(4);
    expect(report.outdatedCount).toBe(2);
    expect(report.deprecatedCount).toBe(1);
    expect(report.unusedCount).toBe(3);

    // Verify recommendations
    const deprecatedRec = report.recommendations.find((r) => r.type === 'deprecated');
    expect(deprecatedRec).toBeDefined();
    expect(deprecatedRec?.severity).toBe('MIGRATION REQUIRED');
    expect(deprecatedRec?.packageName).toBe('request');
    expect(deprecatedRec?.rationale).toContain('Request has been deprecated since 2020');

    const outdatedRec = report.recommendations.find((r) => r.type === 'outdated');
    expect(outdatedRec).toBeDefined();
    expect(outdatedRec?.severity).toBe('BREAKING'); // major upgrade 18.2.0 -> 19.0.0
    expect(outdatedRec?.packageName).toBe('react');

    const unusedRec = report.recommendations.find(
      (r) => r.type === 'unused' && r.packageName === 'lodash',
    );
    expect(unusedRec).toBeDefined();
    expect(unusedRec?.severity).toBe('MINOR REVIEW');
    expect(unusedRec?.packageName).toBe('lodash');

    const missingRec = report.recommendations.find((r) => r.type === 'missing');
    expect(missingRec).toBeDefined();
    expect(missingRec?.severity).toBe('BREAKING');
    expect(missingRec?.packageName).toBe('express');

    const peerRec = report.recommendations.find((r) => r.type === 'peer-issue');
    expect(peerRec).toBeDefined();
    expect(peerRec?.packageName).toBe('react-dom');
    expect(peerRec?.message).toContain('Peer dependency mismatch');
  });
});

function writeProject(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
