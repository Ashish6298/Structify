import {
  AdvancedEnterpriseTemplateEngine,
  createEnterpriseCliCommandList,
  createEnterpriseComponentGenerators,
  createEnterprisePlatformReport,
  DeterministicVariableResolutionEngine,
  EnterpriseBlueprintInheritanceSystem,
  EnterpriseDiagnosticsSubsystem,
  EnterpriseFileGenerationPlanningEngine,
  EnterpriseGeneratorSdk,
  EnterpriseRegistryArchitecture,
  EnterpriseValidationFramework,
  EnterpriseWorkspaceGenerationPlatform,
  IntelligentMergeEngine,
  validateStack,
} from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';

export interface EnterpriseCommandOptions {
  dryRun?: boolean;
  interactive?: boolean;
  force?: boolean;
  yes?: boolean;
  profile?: boolean;
  path?: string;
  output?: string;
  query?: string;
}

export async function handleEnterpriseCommand(
  commandName: string,
  action: string | undefined,
  target: string | undefined,
  context: CLIContext,
  options: EnterpriseCommandOptions = {},
): Promise<void> {
  const output = new CLIOutput(context);
  const payload = createEnterpriseCommandPayload(commandName, action, target, options);
  if (context.json) {
    output.json(payload);
  } else {
    output.info(renderEnterpriseCommandText(payload));
  }
}

function createEnterpriseCommandPayload(
  commandName: string,
  action: string | undefined,
  target: string | undefined,
  options: EnterpriseCommandOptions,
) {
  const configValidation = validateStack({
    projectName: 'enterprise-platform',
    version: '1.0.0',
    mode: 'fullstack',
    stack: {
      frontend: 'next',
      backend: 'express',
      styling: 'tailwind',
      database: 'none',
      orm: 'none',
      packageManager: 'npm',
    },
  });
  if (!configValidation.normalizedConfig) {
    throw new Error('Internal enterprise command config failed validation.');
  }
  const report = createEnterprisePlatformReport(configValidation.normalizedConfig);
  const context = {
    project: { name: 'enterprise-platform', version: '1.0.0', mode: 'fullstack' },
    stack: configValidation.normalizedConfig.stack,
    answers: {},
    workspace: {},
    modules: [],
    preset: {},
    flags: { dryRun: options.dryRun === true, profile: options.profile === true },
    variables: {},
    environment: 'development',
  };
  const registry = new EnterpriseRegistryArchitecture();
  registry.install({
    id: 'template.enterprise.default',
    version: '1.0.0',
    source: 'local',
    location: '.structify/templates/default',
  });
  const blueprintSystem = new EnterpriseBlueprintInheritanceSystem();
  blueprintSystem.register({
    id: 'enterprise-base',
    version: '1.0.0',
    name: 'Enterprise Base',
    structure: ['apps', 'packages', 'docs'],
    tags: ['enterprise'],
  });
  blueprintSystem.register({
    id: 'enterprise-workspace',
    version: '1.0.0',
    name: 'Enterprise Workspace',
    extends: ['enterprise-base'],
    structure: ['apps/web', 'apps/api', 'packages/types'],
    categories: ['workspace'],
  });
  const rendered = new AdvancedEnterpriseTemplateEngine().render(
    'summary',
    [{ id: 'summary', content: 'Project {{project.name | kebab}}' }],
    context,
    { debug: options.profile === true },
  );
  const variables = new DeterministicVariableResolutionEngine().resolve(
    [
      { name: 'projectName', source: 'globalDefaults', value: 'enterprise-platform' },
      { name: 'projectName', source: 'userOverrides', value: target ?? 'enterprise-platform' },
      { name: 'slug', source: 'computedVariables', expression: '${projectName}-workspace' },
    ],
    ['projectName', 'slug'],
  );
  const files = new EnterpriseWorkspaceGenerationPlatform().generate(
    {
      name: String(variables.values.projectName ?? 'enterprise-platform'),
      kind: 'monorepo',
      packageManager: 'npm',
      orchestrator: 'turborepo',
      stacks: ['nestjs'],
    },
    context,
  );
  const plan = new EnterpriseFileGenerationPlanningEngine().createPlan(files, process.cwd(), [
    'template.enterprise.default',
  ]);
  const merge = new IntelligentMergeEngine().preview(
    'package.json',
    '{"dependencies":{"a":"1"}}',
    '{"dependencies":{"b":"2"}}',
  );
  const sdk = new EnterpriseGeneratorSdk();
  sdk.registerPlugin({
    templates: [{ id: 'enterprise-template', content: 'ok' }],
    blueprints: [{ id: 'enterprise-plugin-blueprint', version: '1.0.0', name: 'Plugin' }],
  });
  const validation = new EnterpriseValidationFramework().validate({
    templates: [{ id: 'summary', content: 'ok' }],
    variables,
    blueprints: blueprintSystem.graph(),
    registry: registry.list(),
  });
  const diagnostics = new EnterpriseDiagnosticsSubsystem();
  const commandPayload = {
    command: commandName,
    action: action ?? defaultActionFor(commandName),
    target: target ?? null,
    dryRun: options.dryRun !== false,
    supportedCommands: createEnterpriseCliCommandList(),
    report,
    rendered,
    variables,
    blueprintGraph: blueprintSystem.graph(),
    registry: registry.search(options.query ?? target ?? ''),
    sdk: sdk.snapshot(),
    sdkDocumentation: sdk.docs(),
    componentGeneratorKinds: Object.keys(createEnterpriseComponentGenerators()).sort(),
    workspace: { fileCount: files.length, files: files.map((file) => file.path).sort() },
    plan,
    merge,
    validation,
    diagnostics: diagnostics.statistics({ files, variables }),
    diagnosticsMarkdown: diagnostics.report(report.diagnostics, 'markdown'),
  };
  return commandPayload;
}

function defaultActionFor(commandName: string): string {
  if (commandName === 'registry') return 'list';
  if (['install', 'uninstall', 'update', 'publish'].includes(commandName)) return commandName;
  if (commandName.includes('graph')) return 'show';
  if (commandName.includes('report')) return 'generate';
  return 'explain';
}

function renderEnterpriseCommandText(
  payload: ReturnType<typeof createEnterpriseCommandPayload>,
): string {
  return [
    `Command: ${payload.command}`,
    `Action: ${payload.action}`,
    `Dry Run: ${payload.dryRun ? 'yes' : 'no'}`,
    `Architecture Modules: ${payload.report.architecture.length}`,
    `Workspace Files: ${payload.workspace.fileCount}`,
    `Plan Hash: ${payload.plan.deterministicHash}`,
    `Validation: ${payload.validation.valid ? 'pass' : 'fail'}`,
  ].join('\n');
}
