import * as fs from 'fs';
import * as path from 'path';
import { ProjectGraph } from './project-graph.js';

export interface ProjectValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ProjectValidationResult {
  valid: boolean;
  checkedFiles: string[];
  issues: ProjectValidationIssue[];
  projectGraph?: ProjectGraph;
}

export function validateGeneratedProject(projectPath: string): ProjectValidationResult {
  const required = [
    'package.json',
    'structify.config.json',
    'structify.manifest.json',
    'structify.project-graph.json',
    'README.md',
  ];
  const checkedFiles: string[] = [];
  const issues: ProjectValidationIssue[] = [];

  for (const relativePath of required) {
    checkedFiles.push(relativePath);
    if (!fs.existsSync(path.join(projectPath, relativePath))) {
      issues.push({
        code: 'MISSING_REQUIRED_FILE',
        message: `Missing ${relativePath}`,
        path: relativePath,
      });
    }
  }

  const packagePath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      if (!pkg.scripts?.dev) {
        issues.push({
          code: 'MISSING_DEV_SCRIPT',
          message: 'package.json must include a dev script',
          path: 'package.json',
        });
      }
      if (!pkg.dependencies && !pkg.devDependencies) {
        issues.push({
          code: 'MISSING_DEPENDENCIES',
          message: 'package.json must include dependency sections',
          path: 'package.json',
        });
      }
    } catch (error) {
      issues.push({ code: 'INVALID_PACKAGE_JSON', message: String(error), path: 'package.json' });
    }
  }

  let projectGraph: ProjectGraph | undefined;
  const graphPath = path.join(projectPath, 'structify.project-graph.json');
  if (fs.existsSync(graphPath)) {
    try {
      projectGraph = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as ProjectGraph;
      if (!Array.isArray(projectGraph.nodes) || projectGraph.nodes.length === 0) {
        issues.push({
          code: 'EMPTY_PROJECT_GRAPH',
          message: 'Project Graph must contain nodes',
          path: 'structify.project-graph.json',
        });
      }
    } catch (error) {
      issues.push({
        code: 'INVALID_PROJECT_GRAPH',
        message: String(error),
        path: 'structify.project-graph.json',
      });
    }
  }

  return {
    valid: issues.length === 0,
    checkedFiles,
    issues,
    projectGraph,
  };
}
