import path from 'path';
import fs from 'fs';
import {
  BlueprintSystem,
  createBuiltInPhase8Blueprints,
  createBuiltInPhase8Templates,
  createPhase8RenderContext,
  EnterpriseGenerationPipeline,
  EnterpriseTemplateEngine,
  GeneratorFramework,
  Phase8Generator,
  TemplateRegistryDiscovery,
  TemplateValidator,
  validateStack,
} from '@structify/core';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';

interface Phase8Options {
  config?: string;
  output?: string;
  dryRun?: boolean;
  path?: string;
  template?: string;
  json?: boolean;
}

export async function handleBlueprint(
  action: string,
  blueprintId: string | undefined,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const system = new BlueprintSystem();
  for (const blueprint of createBuiltInPhase8Blueprints()) system.register(blueprint);
  if (action === 'list') {
    print(
      output,
      context,
      { blueprints: system.list() },
      system
        .list()
        .map((blueprint) => `${blueprint.id}@${blueprint.version}`)
        .join('\n'),
    );
    return;
  }
  const resolved = system.resolve(blueprintId ?? 'typescript-application');
  print(output, context, resolved, JSON.stringify(resolved, null, 2));
}

export async function handleTemplates(
  action: string,
  context: CLIContext,
  options: Phase8Options = {},
): Promise<void> {
  const output = new CLIOutput(context);
  if (action === 'discover') {
    const entries = new TemplateRegistryDiscovery().discover([options.path ?? context.cwd]);
    print(
      output,
      context,
      { templates: entries },
      entries.map((entry) => `${entry.id}@${entry.version} ${entry.location}`).join('\n'),
    );
    return;
  }
  const templates = createBuiltInPhase8Templates();
  print(
    output,
    context,
    { templates },
    templates.map((template) => `${template.id} -> ${template.targetPath}`).join('\n'),
  );
}

export async function handleGenerators(context: CLIContext): Promise<void> {
  const output = new CLIOutput(context);
  const framework = new GeneratorFramework();
  framework.register(createCliCommandGenerator());
  print(
    output,
    context,
    { generators: framework.list() },
    framework
      .list()
      .map((generator) => `${generator.id}: ${generator.artifactType}`)
      .join('\n'),
  );
}

export async function handleValidateTemplate(
  context: CLIContext,
  options: Phase8Options = {},
): Promise<void> {
  const output = new CLIOutput(context);
  const renderContext = await loadRenderContext(context, options);
  const result = new TemplateValidator().validate({
    templates: createBuiltInPhase8Templates(),
    blueprints: createBuiltInPhase8Blueprints(),
    context: renderContext,
  });
  print(
    output,
    context,
    result,
    result.valid ? 'Template validation passed.' : JSON.stringify(result.errors, null, 2),
  );
  if (!result.valid) process.exitCode = 1;
}

export async function handleExplainTemplate(
  templateId: string | undefined,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const template = createBuiltInPhase8Templates().find(
    (candidate) => candidate.id === (templateId ?? 'base-readme'),
  );
  if (!template) throw new Error(`Unknown template "${templateId}".`);
  print(output, context, template, JSON.stringify(template, null, 2));
}

export async function handlePlan(context: CLIContext, options: Phase8Options = {}): Promise<void> {
  const output = new CLIOutput(context);
  const renderContext = await loadRenderContext(context, options);
  const result = await new EnterpriseGenerationPipeline().run({
    templates: createBuiltInPhase8Templates(),
    context: renderContext,
    targetDir: path.resolve(
      context.cwd,
      options.output ?? renderContext.project.name?.toString() ?? 'structify-output',
    ),
    dryRun: true,
  });
  print(output, context, result.plan, JSON.stringify(result.plan, null, 2));
}

export async function handleRender(
  context: CLIContext,
  options: Phase8Options = {},
): Promise<void> {
  const output = new CLIOutput(context);
  const renderContext = await loadRenderContext(context, options);
  const files = new EnterpriseTemplateEngine().renderTemplates(
    createBuiltInPhase8Templates(),
    renderContext,
  );
  const selected = options.template
    ? files.filter((file) => file.templateId === options.template)
    : files;
  print(
    output,
    context,
    { files: selected },
    selected.map((file) => `--- ${file.path}\n${file.content}`).join('\n'),
  );
}

export async function handlePreview(
  context: CLIContext,
  options: Phase8Options = {},
): Promise<void> {
  await handlePlan(context, { ...options, dryRun: true });
}

async function loadRenderContext(context: CLIContext, options: Phase8Options) {
  const rawConfig = options.config
    ? JSON.parse(fs.readFileSync(path.resolve(context.cwd, options.config), 'utf8'))
    : {
        projectName: 'phase8-project',
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
      };
  const validation = validateStack(rawConfig);
  if (!validation.valid || !validation.normalizedConfig) {
    throw new Error(validation.errors.map((error) => error.message).join('\n'));
  }
  return createPhase8RenderContext({
    config: validation.normalizedConfig,
    flags: { json: context.json, verbose: context.verbose },
  });
}

function createCliCommandGenerator(): Phase8Generator {
  return {
    metadata: {
      id: 'cli-command',
      name: 'CLI Command Generator',
      version: '1.0.0',
      artifactType: 'cli-command',
      inputs: [{ name: 'name', type: 'string', required: true }],
      outputs: ['apps/cli/src/commands/{{name}}.ts'],
      dependencies: ['commander'],
    },
    generate: () => [],
  };
}

function print(output: CLIOutput, context: CLIContext, jsonPayload: unknown, text: string): void {
  if (context.json) {
    output.json(jsonPayload);
  } else {
    output.info(text);
  }
}
