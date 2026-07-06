import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { getElapsedMs } from '../utils/middleware.js';
import {
  EventBus,
  HookManager,
  PluginManager,
  Registry,
  createBuiltInExtensionPlugin,
  GeneratorDefinition,
  TemplateDefinition,
  ModuleDefinitionSdk,
} from '@structify/core';

export async function handleAdd(
  moduleName: string | undefined,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  output.heading('Structify Add Module');

  if (!moduleName || moduleName.trim() === '') {
    throw new StructifyCLIError(
      'USAGE_ERROR',
      'Module name is required. Example: "structify add tailwind"',
    );
  }
  const eventBus = new EventBus();
  const hookManager = new HookManager();
  const moduleRegistry = new Registry<ModuleDefinitionSdk>();
  const pluginManager = new PluginManager({
    sessionId: `add-${Date.now().toString(36)}`,
    eventBus,
    hookManager,
    generatorRegistry: new Registry<GeneratorDefinition>(),
    templateRegistry: new Registry<TemplateDefinition>(),
    moduleRegistry,
  });
  await pluginManager.register(createBuiltInExtensionPlugin());
  const modulePlan = moduleRegistry
    .list()
    .find(
      (moduleDefinition) =>
        moduleDefinition.id === `mod-${moduleName}` || moduleDefinition.id === moduleName,
    );

  const elapsed = getElapsedMs(context.startTime);

  if (context.json) {
    output.json({
      success: true,
      command: 'add',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      durationMs: elapsed,
      warnings: ['Incremental module setup is not fully implemented in MVP'],
      errors: [],
      data: { moduleName, module: modulePlan ?? null, planOnly: true },
    });
    return;
  }

  output.info(`Selected Module: ${moduleName}`);
  if (modulePlan) {
    output.info(`Module SDK match: ${modulePlan.name} (${modulePlan.version})`);
    output.info(`Detection rules: ${modulePlan.detectionRules.join(', ')}`);
  }
  output.warn('Module installation remains planning-only in Phase 7.');
  output.showFooter('add');
}
