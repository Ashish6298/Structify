import { describe, expect, it } from 'vitest';
import {
  createPlan,
  createModulePlanTool,
  createRepairPlanTool,
  createUpgradePlanTool,
  detectDrift,
  doctor,
  inspectProject,
  listEvents,
  listGenerators,
  listModules,
  listPlugins,
  listSupportedStacks,
  listTemplates,
  previewDiff,
  validateConfig,
  verifyProjectTool,
} from './tools.js';

const config = {
  projectName: 'mcp-demo',
  version: '1.0',
  mode: 'frontend-only' as const,
  stack: {
    frontend: 'next' as const,
    backend: 'none' as const,
    styling: 'tailwind' as const,
    database: 'none' as const,
    orm: 'none' as const,
    packageManager: 'npm' as const,
  },
};

describe('MCP tool contracts', () => {
  it('should expose read-only MCP tools with typed success responses', () => {
    expect(listSupportedStacks().success).toBe(true);
    expect(validateConfig(config).data?.valid).toBe(true);
    expect(createPlan(config).success).toBe(true);
    expect(previewDiff(config, process.cwd()).success).toBe(true);
    expect(inspectProject(process.cwd()).success).toBe(true);
    expect(listGenerators().success).toBe(true);
    expect(listTemplates().success).toBe(true);
    expect(listPlugins().success).toBe(true);
    expect(listModules().success).toBe(true);
    expect(listEvents().data).toContain('GenerationStarted');
    expect(doctor().data?.npm).toBe('required');
    expect(detectDrift(process.cwd()).tool).toBe('detect_drift');
    expect(createModulePlanTool(process.cwd(), 'docker').tool).toBe('create_module_plan');
    expect(previewDiff(config, process.cwd()).tool).toBe('preview_diff');
    expect(createUpgradePlanTool(process.cwd()).tool).toBe('create_upgrade_plan');
    expect(createRepairPlanTool(process.cwd()).tool).toBe('create_repair_plan');
    expect(verifyProjectTool(process.cwd()).tool).toBe('verify_project');
  });
});
