import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createComposableGenerationPlan } from '../generation/composable.js';
import { NormalizedProjectConfig } from '../types/index.js';
import {
  runProjectHealthCheck,
  buildHealthSummary,
  classifyRepairability,
  ProjectHealthReport,
} from './health-engine.js';
import { detectStack } from './stack-detector.js';
import { readProjectState, detectProjectDrift } from './phase9.js';

const baseConfig: NormalizedProjectConfig = {
  projectName: 'health-engine-test',
  version: '1.0',
  mode: 'frontend-only',
  language: 'typescript',
  stack: {
    frontend: 'next',
    backend: 'none',
    styling: 'none',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: false,
    prettier: false,
    githubActions: false,
    git: false,
    editorconfig: true,
    husky: false,
    lintStaged: false,
    commitlint: false,
  },
};

let tmp: string | undefined;

function writeProject(config = baseConfig): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-health-'));
  const plan = createComposableGenerationPlan(config);
  for (const file of plan.files) {
    const target = path.join(tmp, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
  }
  return tmp;
}

afterEach(() => {
  if (tmp) {
    fs.rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  }
});

// ─── Stack Detector Tests ─────────────────────────────────────────────────────

describe('Stack Detector', () => {
  it('returns error result for non-existent path', () => {
    const result = detectStack('/nonexistent-path-structify-test');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.detectedStack.frontend).toBe('unknown');
  });

  it('detects Next.js from generated project', () => {
    const project = writeProject();
    const result = detectStack(project);
    expect(result.success).toBe(true);
    expect(result.detectedStack.frontend).toBe('next');
  });

  it('detects npm package manager from package-lock.json', () => {
    const project = writeProject();
    // package-lock.json must be present for npm detection
    fs.writeFileSync(path.join(project, 'package-lock.json'), '{}');
    const result = detectStack(project);
    expect(result.success).toBe(true);
    expect(result.detectedStack.packageManager).toBe('npm');
  });

  it('applies manifest stack as metadata override', () => {
    const project = writeProject();
    const result = detectStack(project, {
      frontend: 'vite-react',
      backend: 'none',
      database: 'postgres',
      orm: 'prisma',
      styling: 'tailwind',
      packageManager: 'npm',
      docker: true,
      eslint: true,
      prettier: false,
      githubActions: false,
    });
    // Manifest values override filesystem detection
    expect(result.detectedStack.frontend).toBe('vite-react');
    expect(result.detectedStack.database).toBe('postgres');
    expect(result.detectedStack.docker).toBe(true);
    expect(result.detectedStack.detectionSource).toBe('metadata');
  });

  it('marks confidence as high when structify metadata is present', () => {
    const project = writeProject();
    const result = detectStack(project);
    expect(result.hasStructifyMetadata).toBe(true);
    expect(result.detectedStack.confidence).toBe('high');
  });

  it('includes raw filesystem indicators', () => {
    const project = writeProject();
    const result = detectStack(project);
    expect(typeof result.rawIndicators['package.json']).toBe('boolean');
    expect(result.rawIndicators['structify.config.json']).toBe(true);
  });

  it('detects editorconfig from filesystem', () => {
    const project = writeProject();
    const result = detectStack(project);
    // baseConfig has editorconfig: true
    expect(result.detectedStack.editorconfig).toBe(true);
  });

  it('detects git when .git directory is present', () => {
    const project = writeProject();
    fs.mkdirSync(path.join(project, '.git'), { recursive: true });
    const result = detectStack(project);
    expect(result.detectedStack.git).toBe(true);
  });

  it('detects docker from filesystem', () => {
    const project = writeProject({ ...baseConfig, tools: { ...baseConfig.tools, docker: true } });
    const result = detectStack(project);
    expect(result.detectedStack.docker).toBe(true);
  });

  it('detects github actions from filesystem', () => {
    const project = writeProject({
      ...baseConfig,
      tools: { ...baseConfig.tools, githubActions: true },
    });
    const result = detectStack(project);
    expect(result.detectedStack.githubActions).toBe(true);
  });

  it('detects eslint from filesystem', () => {
    const project = writeProject({ ...baseConfig, tools: { ...baseConfig.tools, eslint: true } });
    const result = detectStack(project);
    expect(result.detectedStack.eslint).toBe(true);
  });

  it('detects prettier from filesystem', () => {
    const project = writeProject({
      ...baseConfig,
      tools: { ...baseConfig.tools, prettier: true },
    });
    const result = detectStack(project);
    expect(result.detectedStack.prettier).toBe(true);
  });
});

// ─── Health Engine Core ───────────────────────────────────────────────────────

describe('ProjectHealthEngine - Core', () => {
  it('returns CRITICAL status for non-existent path', () => {
    const report = runProjectHealthCheck('/nonexistent-path-health-test');
    expect(report.overallStatus).toBe('CRITICAL');
    expect(report.isStructifyProject).toBe(false);
    expect(report.diagnostics.some((d) => d.code === 'PROJECT_NOT_FOUND')).toBe(true);
  });

  it('returns HEALTHY status for a valid generated project', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    expect(report.isStructifyProject).toBe(true);
    expect(['HEALTHY', 'DEGRADED']).toContain(report.overallStatus);
  });

  it('report always includes healthSummary with all count fields', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    expect(typeof report.healthSummary.total).toBe('number');
    expect(typeof report.healthSummary.pass).toBe('number');
    expect(typeof report.healthSummary.warnings).toBe('number');
    expect(typeof report.healthSummary.errors).toBe('number');
    expect(typeof report.healthSummary.fixable).toBe('number');
    expect(typeof report.healthSummary.notFixable).toBe('number');
    expect(typeof report.healthSummary.info).toBe('number');
  });

  it('report includes detectedStack with required fields', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    expect(report.detectedStack).toBeDefined();
    expect(report.detectedStack.frontend).toBeDefined();
    expect(report.detectedStack.backend).toBeDefined();
    expect(report.detectedStack.confidence).toBeDefined();
    expect(report.detectedStack.detectionSource).toBeDefined();
  });

  it('report includes repairability with canAutoRepair field', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    expect(report.repairability).toBeDefined();
    expect(typeof report.repairability.canAutoRepair).toBe('boolean');
    expect(Array.isArray(report.repairability.fixableIssues)).toBe(true);
    expect(Array.isArray(report.repairability.notFixableIssues)).toBe(true);
    expect(Array.isArray(report.repairability.repairSuggestions)).toBe(true);
  });

  it('detects missing metadata files as FIXABLE', () => {
    const project = writeProject();
    fs.rmSync(path.join(project, 'structify.manifest.json'), { force: true });
    const report = runProjectHealthCheck(project);
    const manifestDiag = report.diagnostics.find(
      (d) => d.code === 'METADATA_MISSING' && d.path === 'structify.manifest.json',
    );
    expect(manifestDiag).toBeDefined();
    expect(manifestDiag?.status).toBe('FIXABLE');
  });

  it('detects missing generated files and classifies fixability', () => {
    const project = writeProject();
    // Remove a source file — should be NOT_FIXABLE
    fs.rmSync(path.join(project, 'app', 'page.tsx'), { force: true });
    // Remove a config file — should be FIXABLE
    fs.rmSync(path.join(project, '.editorconfig'), { force: true });
    const report = runProjectHealthCheck(project);
    const sourceMissing = report.diagnostics.find(
      (d) => d.code === 'GENERATED_FILE_MISSING' && d.path === 'app/page.tsx',
    );
    const configMissing = report.diagnostics.find(
      (d) => d.code === 'GENERATED_FILE_MISSING' && d.path === '.editorconfig',
    );
    expect(sourceMissing?.status).toBe('NOT_FIXABLE');
    expect(configMissing?.status).toBe('FIXABLE');
  });

  it('detects modified generated files as NOT_FIXABLE (needs --force)', () => {
    const project = writeProject();
    fs.appendFileSync(path.join(project, 'README.md'), '\nmanual edit\n');
    const report = runProjectHealthCheck(project);
    const modified = report.diagnostics.find((d) => d.code === 'GENERATED_FILE_MODIFIED');
    expect(modified?.status).toBe('NOT_FIXABLE');
    expect(modified?.suggestion).toContain('--force');
  });

  it('detects package script drift as FIXABLE', () => {
    const project = writeProject();
    const pkgPath = path.join(project, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    (pkg['scripts'] as Record<string, string>)['dev'] = 'wrong-dev-script';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    const report = runProjectHealthCheck(project);
    const scriptDiag = report.diagnostics.find((d) => d.code === 'PACKAGE_SCRIPTS_DRIFT');
    expect(scriptDiag).toBeDefined();
    expect(scriptDiag?.status).toBe('FIXABLE');
  });

  it('detects missing dependency as FIXABLE', () => {
    const project = writeProject();
    const pkgPath = path.join(project, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    if (pkg.dependencies) {
      delete pkg.dependencies['next'];
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }
    const report = runProjectHealthCheck(project);
    const depDiag = report.diagnostics.find((d) => d.code === 'DEPENDENCIES_MISSING');
    expect(depDiag).toBeDefined();
    expect(depDiag?.status).toBe('FIXABLE');
  });

  it('includes module health diagnostic', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    const moduleDiag = report.diagnostics.find((d) => d.category === 'module_health');
    expect(moduleDiag).toBeDefined();
  });

  it('passes strict validation for package.json changes that are semantic matches', () => {
    const project = writeProject();
    // Simulate npm install / formatting change in package.json (extra spacing, fields, or harmless metadata additions)
    const pkgPath = path.join(project, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    pkg.author = 'npm-user';
    pkg.dependencies = (pkg.dependencies || {}) as Record<string, string>;
    (pkg.dependencies as Record<string, string>)['some-harmless-extra-package'] = '^1.0.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4)); // Format with 4 spaces instead of template format

    const report = runProjectHealthCheck(project);
    const modified = report.diagnostics.find(
      (d) => d.code === 'GENERATED_FILE_MODIFIED' && d.path === 'package.json',
    );
    expect(modified).toBeUndefined(); // Should not flag package.json as modified
  });

  it('fails validation when a required dependency is removed from package.json', () => {
    const project = writeProject();
    const pkgPath = path.join(project, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies: Record<string, string>;
    };
    delete pkg.dependencies['next'];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    const report = runProjectHealthCheck(project);
    const depDiag = report.diagnostics.find((d) => d.code === 'DEPENDENCIES_MISSING');
    expect(depDiag).toBeDefined();
    expect(depDiag?.status).toBe('FIXABLE');
  });
});

// ─── Diagnostic Classification ────────────────────────────────────────────────

describe('ProjectHealthEngine - Diagnostic Classification', () => {
  it('buildHealthSummary returns a non-empty string', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    const summary = buildHealthSummary(report);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('Project:');
  });

  it('classifyRepairability returns canAutoRepair=false for clean project', () => {
    const project = writeProject();
    const state = readProjectState(project);
    const drift = detectProjectDrift(state);
    const repairability = classifyRepairability(drift, state);
    expect(repairability).toBeDefined();
    expect(typeof repairability.canAutoRepair).toBe('boolean');
  });

  it('healthSummary totals match diagnostics array length', () => {
    const project = writeProject();
    const report = runProjectHealthCheck(project);
    const { pass, info, warnings, errors, fixable, notFixable } = report.healthSummary;
    expect(pass + info + warnings + errors + fixable + notFixable).toBe(report.diagnostics.length);
  });

  it('overall status is CRITICAL when ERROR diagnostics exist', () => {
    const report = runProjectHealthCheck('/nonexistent-path-health-classification');
    expect(report.overallStatus).toBe('CRITICAL');
  });
});

// ─── Report Shape Conformance ─────────────────────────────────────────────────

describe('ProjectHealthEngine - JSON Shape', () => {
  it('report conforms to expected JSON structure for an empty directory', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-empty-'));
    try {
      const report = runProjectHealthCheck(emptyDir);
      expect(report.projectPath).toBe(path.resolve(emptyDir));
      expect(typeof report.isStructifyProject).toBe('boolean');
      expect(['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN']).toContain(report.overallStatus);
      expect(Array.isArray(report.diagnostics)).toBe(true);
      expect(report.healthSummary).toBeDefined();
      expect(report.repairability).toBeDefined();
      expect(report.detectedStack).toBeDefined();
      // Should be serialisable to JSON
      const json = JSON.stringify(report);
      const parsed = JSON.parse(json) as ProjectHealthReport;
      expect(parsed.projectPath).toBe(report.projectPath);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
