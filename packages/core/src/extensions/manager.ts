import { Registry } from '../registry/base.js';
import { EventBus } from '../events/index.js';
import { HookManager } from '../hooks/index.js';
import {
  GeneratorDefinition,
  ModuleDefinitionSdk,
  PluginDefinition,
  TemplateDefinition,
  validateGeneratorDefinition,
  validateModuleDefinition,
  validatePluginMetadata,
  validateTemplateDefinition,
} from './sdk.js';

export class PluginManager {
  private plugins = new Map<string, PluginDefinition>();

  public constructor(
    private readonly options: {
      sessionId: string;
      eventBus: EventBus;
      hookManager: HookManager;
      generatorRegistry: Registry<GeneratorDefinition>;
      templateRegistry: Registry<TemplateDefinition>;
      moduleRegistry: Registry<ModuleDefinitionSdk>;
    },
  ) {}

  public async register(plugin: PluginDefinition): Promise<void> {
    validatePluginMetadata(plugin.metadata);
    if (this.plugins.has(plugin.metadata.id)) {
      throw new Error(`Duplicate plugin id "${plugin.metadata.id}".`);
    }

    try {
      await plugin.onLoad?.();
      for (const generator of plugin.generators ?? []) {
        validateGeneratorDefinition(generator);
        this.options.generatorRegistry.register(generator);
      }
      for (const template of plugin.templates ?? []) {
        const validation = validateTemplateDefinition(template);
        if (!validation.valid) {
          throw new Error(validation.errors.join(', '));
        }
        this.options.templateRegistry.register(template);
      }
      for (const moduleDefinition of plugin.modules ?? []) {
        validateModuleDefinition(moduleDefinition);
        this.options.moduleRegistry.register(moduleDefinition);
      }
      for (const hook of plugin.hooks ?? []) {
        this.options.hookManager.register(hook);
      }

      this.plugins.set(plugin.metadata.id, plugin);
      await this.options.eventBus.emit({
        name: 'PluginLoaded',
        sessionId: this.options.sessionId,
        source: 'plugin-manager',
        payload: { pluginId: plugin.metadata.id, version: plugin.metadata.version },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.options.eventBus.emit({
        name: 'PluginFailed',
        sessionId: this.options.sessionId,
        severity: 'error',
        source: 'plugin-manager',
        payload: { pluginId: plugin.metadata.id, error: message },
      });
      throw error;
    }
  }

  public list(): PluginDefinition[] {
    return [...this.plugins.values()];
  }

  public get(id: string): PluginDefinition {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin "${id}" is not registered.`);
    }
    return plugin;
  }

  public async unloadAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.onUnload?.();
    }
    this.plugins.clear();
  }
}
