import {
  DEFAULT_CONFIG,
  FRONTEND_OPTIONS,
  BACKEND_OPTIONS,
  STYLING_OPTIONS,
  DATABASE_OPTIONS,
  ORM_OPTIONS,
  validateStack,
  createProjectPlan,
  getStarterTemplates,
  VirtualFileGraph,
  ProjectDiffEngine,
  registerBuiltIns,
  generatorRegistry,
  templateRegistry,
  pluginRegistry,
  moduleRegistry,
  ProjectConfig,
  createModulePlan,
  createRepairPlan,
  createUpgradePlan,
  detectProjectDrift,
  readProjectState,
  validateGeneratedProject,
} from '@structify/core';

export interface McpToolResult<T> {
  success: boolean;
  tool: string;
  data?: T;
  error?: string;
}

export function listSupportedStacks(): McpToolResult<Record<string, unknown>> {
  return {
    success: true,
    tool: 'list_supported_stacks',
    data: {
      frontend: FRONTEND_OPTIONS,
      backend: BACKEND_OPTIONS,
      styling: STYLING_OPTIONS,
      database: DATABASE_OPTIONS,
      orm: ORM_OPTIONS,
      defaultConfig: DEFAULT_CONFIG,
    },
  };
}

export function validateConfig(
  config: ProjectConfig,
): McpToolResult<ReturnType<typeof validateStack>> {
  return { success: true, tool: 'validate_config', data: validateStack(config) };
}

export function createPlan(
  config: ProjectConfig,
): McpToolResult<ReturnType<typeof createProjectPlan>> {
  const validation = validateStack(config);
  if (!validation.valid || !validation.normalizedConfig) {
    return { success: false, tool: 'create_plan', error: 'Invalid config.' };
  }
  return {
    success: true,
    tool: 'create_plan',
    data: createProjectPlan(validation.normalizedConfig.projectName, validation.normalizedConfig),
  };
}

export function previewDiff(config: ProjectConfig, targetDir: string): McpToolResult<unknown> {
  const validation = validateStack(config);
  if (!validation.valid || !validation.normalizedConfig) {
    return { success: false, tool: 'preview_diff', error: 'Invalid config.' };
  }
  const graph = new VirtualFileGraph();
  for (const file of getStarterTemplates(validation.normalizedConfig)) {
    graph.addFile({
      targetPath: file.path,
      content: file.content,
      sourceGenerator: 'mcp-preview',
      sourceTemplate: `file:${file.path}`,
      conflictPolicy: 'error',
      dependencies: [],
      fileType: file.path.endsWith('.json') ? 'json' : 'text',
      rollback: { deleteOnRollback: true, restoreBackup: false },
    });
  }
  return { success: true, tool: 'preview_diff', data: ProjectDiffEngine.compare(graph, targetDir) };
}

export function inspectProject(projectPath: string): McpToolResult<Record<string, unknown>> {
  const state = readProjectState(projectPath);
  const drift = detectProjectDrift(state);
  return {
    success: true,
    tool: 'inspect_project',
    data: {
      hasManifest: Boolean(state.manifest),
      manifest: state.manifest ?? null,
      hasConfig: Boolean(state.config),
      state,
      drift,
    },
  };
}

export function detectDrift(projectPath: string): McpToolResult<unknown> {
  const state = readProjectState(projectPath);
  return { success: true, tool: 'detect_drift', data: detectProjectDrift(state) };
}

export function createModulePlanTool(
  projectPath: string,
  moduleName: string,
): McpToolResult<unknown> {
  return {
    success: true,
    tool: 'create_module_plan',
    data: createModulePlan(projectPath, moduleName, { dryRun: true }),
  };
}

export function previewModuleDiff(projectPath: string, moduleName: string): McpToolResult<unknown> {
  const plan = createModulePlan(projectPath, moduleName, { dryRun: true });
  return {
    success: plan.code === 'MODULE_PLAN_READY',
    tool: 'preview_module_diff',
    data: plan.plan,
  };
}

export function createUpgradePlanTool(projectPath: string): McpToolResult<unknown> {
  return { success: true, tool: 'create_upgrade_plan', data: createUpgradePlan(projectPath) };
}

export function createRepairPlanTool(projectPath: string): McpToolResult<unknown> {
  return {
    success: true,
    tool: 'create_repair_plan',
    data: createRepairPlan(projectPath, { dryRun: true }),
  };
}

export function verifyProjectTool(projectPath: string): McpToolResult<unknown> {
  const validation = validateGeneratedProject(projectPath);
  const state = readProjectState(projectPath);
  return {
    success: validation.valid,
    tool: 'verify_project',
    data: { validation, state, drift: detectProjectDrift(state) },
  };
}

export function listGenerators(): McpToolResult<unknown[]> {
  registerBuiltIns();
  return { success: true, tool: 'list_generators', data: generatorRegistry.list() };
}

export function listTemplates(): McpToolResult<unknown[]> {
  registerBuiltIns();
  return { success: true, tool: 'list_templates', data: templateRegistry.list() };
}

export function listPlugins(): McpToolResult<unknown[]> {
  registerBuiltIns();
  return { success: true, tool: 'list_plugins', data: pluginRegistry.list() };
}

export function listModules(): McpToolResult<unknown[]> {
  registerBuiltIns();
  return { success: true, tool: 'list_modules', data: moduleRegistry.list() };
}

export function listEvents(): McpToolResult<string[]> {
  return {
    success: true,
    tool: 'list_events',
    data: [
      'GenerationStarted',
      'GenerationFinished',
      'TemplateRendered',
      'FileWritten',
      'RollbackFinished',
    ],
  };
}

export function doctor(): McpToolResult<Record<string, string>> {
  return {
    success: true,
    tool: 'doctor',
    data: {
      node: process.version,
      npm: 'required',
      generation: 'read-only MCP tools enabled',
    },
  };
}
