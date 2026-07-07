import { NormalizedProjectConfig, RollbackAction } from '../types/index.js';
import { ExecutionGraph } from './graph.js';
import { EventBus, StructifyEvent } from '../events/index.js';
import { HookManager } from '../hooks/index.js';
import { Registry } from '../registry/base.js';
import { DependencyRegistry } from '../registry/dependency.js';
import { SafeFileOperationManager } from '../filesystem/safe-ops.js';
import { RollbackManager } from './rollback.js';
import {
  GeneratorDefinition,
  ModuleDefinitionSdk,
  PluginManager,
  TemplateDefinition,
} from '../extensions/index.js';
import { ProjectDiff, VirtualFileGraph, TransactionResult } from '../platform/index.js';
import { DependencyGraphResult, ProjectGraph } from '../platform/index.js';
import { GenerationAnalytics } from '../generation/composable.js';
import { createServiceToken, ServiceContainer } from '../platform/service-container.js';

const EventBusToken = createServiceToken<EventBus>('eventBus');
const HookManagerToken = createServiceToken<HookManager>('hookManager');
const DependencyRegistryToken = createServiceToken<DependencyRegistry>('dependencyRegistry');
const FileOperationManagerToken =
  createServiceToken<SafeFileOperationManager>('fileOperationManager');
const RollbackManagerToken = createServiceToken<RollbackManager>('rollbackManager');

export interface CommandLog {
  commandLine: string;
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface SessionMetrics {
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export interface DiagnosticEntry {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface StepExecutionRecord {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  outputs: string[];
  warnings: string[];
  errors: string[];
}

export interface RollbackResult {
  actionId: string;
  description: string;
  success: boolean;
  error?: string;
}

export interface SerializedGenerationResult {
  success: boolean;
  command: 'init';
  version: string;
  projectName: string;
  timestamp: string;
  durationMs: number;
  warnings: string[];
  errors: string[];
  diagnostics: DiagnosticEntry[];
  generatedFiles: string[];
  skippedFiles: string[];
  executedCommands: CommandLog[];
  plannedRollbackActions: {
    id: string;
    type: RollbackAction['type'];
    targetPath: string;
    description: string;
  }[];
  rollbackActions: string[];
  rollbackResults: RollbackResult[];
  projectPath: string;
  targetDir: string;
  nextSteps: string[];
  progress: number;
  sessionId: string;
  events: { name: string; severity: string; source: string; timestamp: string }[];
  virtualFileGraph?: { fileCount: number; files: string[] };
  diff?: ProjectDiff;
  transaction?: TransactionResult;
  projectGraph?: ProjectGraph;
  dependencyGraph?: DependencyGraphResult;
  analytics?: GenerationAnalytics & { durationMs: number; eventCount: number };
}

export class GenerationSession {
  public sessionId: string;
  public config: NormalizedProjectConfig;
  public context: unknown;
  public graph: ExecutionGraph;
  public eventBus: EventBus;
  public hookManager: HookManager;
  public pluginManager: PluginManager;
  public generatorRegistry: Registry<GeneratorDefinition>;
  public templateRegistry: Registry<TemplateDefinition>;
  public moduleRegistry: Registry<ModuleDefinitionSdk>;
  public dependencyRegistry: DependencyRegistry;
  public fileOperationManager: SafeFileOperationManager;
  public rollbackManager: RollbackManager;
  public virtualFileGraph = new VirtualFileGraph();
  public diff?: ProjectDiff;
  public transaction?: TransactionResult;
  public projectGraph?: ProjectGraph;
  public resolvedDependencyGraph?: DependencyGraphResult;
  public analytics?: GenerationAnalytics;
  public rollbackStack: RollbackAction[] = [];
  public diagnostics: DiagnosticEntry[] = [];
  public metrics: SessionMetrics;
  public progress = 0;
  public dryRun: boolean;
  public jsonMode: boolean;
  public targetDir: string;
  public serviceContainer: ServiceContainer;
  public generatedFiles: string[] = [];
  public skippedFiles: string[] = [];
  public executedCommands: CommandLog[] = [];
  public warnings: string[] = [];
  public errors: string[] = [];
  public stepRecords: StepExecutionRecord[] = [];
  public rollbackResults: RollbackResult[] = [];
  public nextSteps: string[] = [];
  public isCancelled = false;

  constructor(options: {
    config: NormalizedProjectConfig;
    context: unknown;
    graph: ExecutionGraph;
    dryRun?: boolean;
    jsonMode?: boolean;
    targetDir: string;
    sessionId?: string;
    eventBus?: EventBus;
    hookManager?: HookManager;
    serviceContainer?: ServiceContainer;
  }) {
    this.sessionId = options.sessionId ?? `sess-${Date.now().toString(36)}`;
    this.config = options.config;
    this.context = options.context;
    this.graph = options.graph;
    this.dryRun = options.dryRun ?? false;
    this.jsonMode = options.jsonMode ?? false;
    this.targetDir = options.targetDir;
    this.metrics = { startTime: Date.now() };
    this.serviceContainer =
      options.serviceContainer?.createScope() ?? createDefaultSessionContainer(this.dryRun);
    this.eventBus = options.eventBus ?? this.serviceContainer.resolve(EventBusToken);
    this.hookManager = options.hookManager ?? this.serviceContainer.resolve(HookManagerToken);
    this.generatorRegistry = new Registry<GeneratorDefinition>();
    this.templateRegistry = new Registry<TemplateDefinition>();
    this.moduleRegistry = new Registry<ModuleDefinitionSdk>();
    this.dependencyRegistry = this.serviceContainer.resolve(DependencyRegistryToken);
    this.fileOperationManager = this.serviceContainer.resolve(FileOperationManagerToken);
    this.rollbackManager = this.serviceContainer.resolve(RollbackManagerToken);
    this.pluginManager = new PluginManager({
      sessionId: this.sessionId,
      eventBus: this.eventBus,
      hookManager: this.hookManager,
      generatorRegistry: this.generatorRegistry,
      templateRegistry: this.templateRegistry,
      moduleRegistry: this.moduleRegistry,
    });
  }

  public addWarning(warning: string): void {
    this.warnings.push(warning);
    this.addDiagnostic(warning, 'warning');
  }

  public addError(error: string): void {
    this.errors.push(error);
    this.addDiagnostic(error, 'error');
  }

  public addDiagnostic(message: string, level: DiagnosticEntry['level'] = 'info'): void {
    this.diagnostics.push({
      level,
      message,
      timestamp: new Date().toISOString(),
    });
    void this.eventBus.emit({
      name: 'DiagnosticEmitted',
      sessionId: this.sessionId,
      severity: level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info',
      source: 'generation-session',
      payload: { message, level },
    });
  }

  public registerGeneratedFile(filePath: string): void {
    if (!this.generatedFiles.includes(filePath)) {
      this.generatedFiles.push(filePath);
    }
  }

  public registerSkippedFile(filePath: string): void {
    if (!this.skippedFiles.includes(filePath)) {
      this.skippedFiles.push(filePath);
    }
  }

  public registerRollbackAction(action: RollbackAction): void {
    this.rollbackStack.push(action);
  }

  public recordCommand(log: CommandLog): void {
    this.executedCommands.push(log);
  }

  public recordStep(record: StepExecutionRecord): void {
    this.stepRecords.push(record);
  }

  public recordRollbackResult(result: RollbackResult): void {
    this.rollbackResults.push(result);
  }

  public setNextSteps(nextSteps: string[]): void {
    this.nextSteps = [...nextSteps];
  }

  public updateProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  public end(): void {
    this.metrics.endTime = Date.now();
    this.metrics.durationMs = this.metrics.endTime - this.metrics.startTime;
  }

  public serialize(): SerializedGenerationResult {
    return {
      success: this.errors.length === 0 && !this.isCancelled,
      command: 'init',
      version: '1.0.0',
      projectName: this.config.projectName,
      timestamp: new Date(this.metrics.startTime).toISOString(),
      durationMs: this.metrics.durationMs ?? Date.now() - this.metrics.startTime,
      warnings: this.warnings,
      errors: this.errors,
      diagnostics: this.diagnostics,
      generatedFiles: this.generatedFiles,
      skippedFiles: this.skippedFiles,
      executedCommands: this.executedCommands,
      plannedRollbackActions: this.rollbackStack.map((action) => ({
        id: action.id,
        type: action.type,
        targetPath: action.targetPath,
        description: action.description,
      })),
      rollbackActions: this.rollbackStack.map((r) => r.description),
      rollbackResults: this.rollbackResults,
      projectPath: this.targetDir,
      targetDir: this.targetDir,
      nextSteps: this.nextSteps,
      progress: this.progress,
      sessionId: this.sessionId,
      events: this.eventBus.getHistory().map((event: StructifyEvent) => ({
        name: event.name,
        severity: event.severity,
        source: event.source,
        timestamp: event.timestamp,
      })),
      virtualFileGraph: {
        fileCount: this.virtualFileGraph.list().length,
        files: this.virtualFileGraph.list().map((file) => file.targetPath),
      },
      diff: this.diff,
      transaction: this.transaction,
      projectGraph: this.projectGraph,
      dependencyGraph: this.resolvedDependencyGraph,
      analytics: this.analytics
        ? {
            ...this.analytics,
            durationMs: this.metrics.durationMs ?? Date.now() - this.metrics.startTime,
            eventCount: this.eventBus.getHistory().length,
          }
        : undefined,
    };
  }
}

function createDefaultSessionContainer(dryRun: boolean): ServiceContainer {
  const container = new ServiceContainer();
  container.registerScoped(EventBusToken, () => new EventBus());
  container.registerScoped(HookManagerToken, () => new HookManager());
  container.registerScoped(DependencyRegistryToken, () => new DependencyRegistry());
  container.registerScoped(
    FileOperationManagerToken,
    () => new SafeFileOperationManager({ dryRun, conflictPolicy: 'error' }),
  );
  container.registerScoped(RollbackManagerToken, () => new RollbackManager());
  return container;
}
