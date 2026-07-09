import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeProject,
  isArchitectural,
  isAsset,
  isConfiguration,
  isGenerated,
  isIgnored,
} from './index.js';

const tempDirs: string[] = [];

describe('Project Intelligence Engine', () => {
  afterEach(() => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('analyzes a Structify-generated style project with normalized files and tree nodes', () => {
    const projectDir = createTempProject('structify-intelligence-');
    writeProjectFiles(projectDir, {
      'package.json': JSON.stringify(
        {
          name: 'structify-app',
          dependencies: { next: '^14.1.0', react: '^18.2.0', express: '^4.19.0' },
          devDependencies: { tailwindcss: '^3.4.0', eslint: '^9.0.0' },
        },
        null,
        2,
      ),
      'package-lock.json': '{}',
      'structify.config.json': '{"projectName":"structify-app"}',
      'structify.manifest.json': '{"stackHash":"abc"}',
      'app/page.tsx': 'export default function Page() { return <main>Hello</main>; }',
      'app/layout.tsx': 'export default function Layout({ children }) { return children; }',
      'src/server.ts': 'import express from "express";',
      'prisma/schema.prisma': 'datasource db { provider = "postgresql" }',
      'tailwind.config.ts': 'export default {};',
      '.env.local': 'NEXT_PUBLIC_API_URL=http://localhost:3000',
      'public/logo.svg': '<svg />',
    });

    const analysis = analyzeProject(projectDir);

    expect(analysis.project.exists).toBe(true);
    expect(analysis.project.type).toBe('structify');
    expect(analysis.framework.frontend).toContain('next');
    expect(analysis.framework.backend).toContain('express');
    expect(analysis.framework.orm).toContain('prisma');
    expect(analysis.packageManager.name).toBe('npm');
    expect(analysis.metadata.structifyConfig).toBe('structify.config.json');
    expect(analysis.dependencies.dependencies).toHaveProperty('next');
    expect(analysis.modules.detected).toContain('tailwind');
    expect(analysis.architecture.frontend.paths).toContain('app/page.tsx');
    expect(analysis.architecture.database.paths).toContain('prisma/schema.prisma');
    expect(analysis.architecture.configuration.paths).toContain('tailwind.config.ts');
    expect(analysis.relationships).toEqual([]);
    expect(analysis.files.some((file) => file.type === 'page')).toBe(true);
    expect(analysis.files.some((file) => file.type === 'environment')).toBe(true);
    expect(analysis.tree.children.some((node) => node.path === 'app')).toBe(true);
  });

  it('analyzes an existing non-Structify project and detects workspace packages', () => {
    const projectDir = createTempProject('external-intelligence-');
    writeProjectFiles(projectDir, {
      'package.json': JSON.stringify(
        {
          name: 'workspace-root',
          workspaces: ['apps/*', 'packages/*'],
          dependencies: { react: '^18.2.0', vite: '^5.0.0' },
        },
        null,
        2,
      ),
      'vite.config.ts': 'export default {};',
      'src/main.tsx': 'import React from "react";',
      'packages/ui/package.json': JSON.stringify({ name: '@acme/ui', version: '1.0.0' }, null, 2),
    });

    const analysis = analyzeProject(projectDir);

    expect(analysis.project.type).toBe('external');
    expect(analysis.project.workspace).toBe(true);
    expect(analysis.framework.frontend).toContain('vite');
    expect(analysis.metadata.workspacePackageJsons).toContain('packages/ui/package.json');
  });

  it('ignores build artifacts and generated folders', () => {
    const projectDir = createTempProject('ignored-intelligence-');
    writeProjectFiles(projectDir, {
      'package.json': '{"name":"ignored-app"}',
      'src/index.ts': 'console.log("ok");',
      'dist/generated.js': 'console.log("dist");',
      '.next/server/app.js': 'next build output',
      'coverage/coverage-final.json': '{}',
    });

    const analysis = analyzeProject(projectDir);

    expect(analysis.files.some((file) => file.path.startsWith('dist/'))).toBe(false);
    expect(analysis.files.some((file) => file.path.startsWith('.next/'))).toBe(false);
    expect(analysis.files.some((file) => file.path.startsWith('coverage/'))).toBe(false);
  });

  it('returns an empty normalized analysis for a missing path', () => {
    const missingPath = path.join(os.tmpdir(), `structify-missing-${Date.now()}`);
    const analysis = analyzeProject(missingPath);

    expect(analysis.project.exists).toBe(false);
    expect(analysis.files).toEqual([]);
    expect(analysis.packageManager.name).toBe('unknown');
  });

  it('exposes reusable ignore and classification helpers', () => {
    expect(isIgnored('node_modules/react/index.js')).toBe(true);
    expect(isGenerated('package-lock.json')).toBe(true);
    expect(isConfiguration('tailwind.config.ts')).toBe(true);
    expect(isAsset('public/logo.svg')).toBe(true);
    expect(isArchitectural('app/page.tsx')).toBe(true);
  });
});

function createTempProject(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

function writeProjectFiles(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
}
