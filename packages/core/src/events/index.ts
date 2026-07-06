export type StructifyEventName =
  | 'GenerationStarted'
  | 'GenerationFinished'
  | 'GenerationFailed'
  | 'PlanningStarted'
  | 'PlanningFinished'
  | 'TemplateRenderStarted'
  | 'TemplateRendered'
  | 'TemplateRenderFailed'
  | 'FileWriteStarted'
  | 'FileWritten'
  | 'FileWriteSkipped'
  | 'FileWriteFailed'
  | 'DependencyResolutionStarted'
  | 'DependencyResolved'
  | 'CommandPlanned'
  | 'CommandExecuted'
  | 'RollbackStarted'
  | 'RollbackStepCompleted'
  | 'RollbackFinished'
  | 'PluginLoaded'
  | 'PluginFailed'
  | 'HookStarted'
  | 'HookFinished'
  | 'HookFailed'
  | 'DiagnosticEmitted';

export type EventSeverity = 'debug' | 'info' | 'warning' | 'error';

export interface StructifyEventPayloadMap {
  GenerationStarted: { projectName: string; targetDir: string };
  GenerationFinished: { projectName: string; generatedFiles: number; durationMs: number };
  GenerationFailed: { error: string };
  PlanningStarted: { projectName: string };
  PlanningFinished: { projectName: string; stepCount: number };
  TemplateRenderStarted: { templateId: string; targetPath: string };
  TemplateRendered: { templateId: string; targetPath: string };
  TemplateRenderFailed: { templateId: string; targetPath: string; error: string };
  FileWriteStarted: { path: string };
  FileWritten: { path: string; overwritten: boolean };
  FileWriteSkipped: { path: string; reason: string };
  FileWriteFailed: { path: string; error: string };
  DependencyResolutionStarted: { packageManager: string };
  DependencyResolved: { dependencies: number; devDependencies: number; diagnostics?: unknown[] };
  CommandPlanned: { commandLine: string };
  CommandExecuted: { commandLine: string; code: number; durationMs: number };
  RollbackStarted: { actionCount: number };
  RollbackStepCompleted: { actionId: string; success: boolean; error?: string };
  RollbackFinished: { success: boolean };
  PluginLoaded: { pluginId: string; version: string };
  PluginFailed: { pluginId: string; error: string };
  HookStarted: { hookPoint: string; hookId: string };
  HookFinished: { hookPoint: string; hookId: string; cancelled: boolean };
  HookFailed: { hookPoint: string; hookId: string; error: string };
  DiagnosticEmitted: { message: string; level: 'info' | 'warning' | 'error' };
}

export interface StructifyEvent<TName extends StructifyEventName = StructifyEventName> {
  id: string;
  name: TName;
  timestamp: string;
  sessionId: string;
  severity: EventSeverity;
  source: string;
  payload: StructifyEventPayloadMap[TName];
  correlationId?: string;
}

export type StructifyEventHandler<TName extends StructifyEventName> = (
  event: StructifyEvent<TName>,
) => void | Promise<void>;

export interface EmitEventOptions<TName extends StructifyEventName> {
  name: TName;
  sessionId: string;
  severity?: EventSeverity;
  source: string;
  payload: StructifyEventPayloadMap[TName];
  correlationId?: string;
}

export class EventBus {
  private handlers = new Map<StructifyEventName, Set<StructifyEventHandler<StructifyEventName>>>();
  private allHandlers = new Set<StructifyEventHandler<StructifyEventName>>();
  private history: StructifyEvent[] = [];
  private sequence = 0;

  public subscribe<TName extends StructifyEventName>(
    name: TName,
    handler: StructifyEventHandler<TName>,
  ): () => void {
    const handlers =
      this.handlers.get(name) ?? new Set<StructifyEventHandler<StructifyEventName>>();
    const typedHandler = handler as StructifyEventHandler<StructifyEventName>;
    handlers.add(typedHandler);
    this.handlers.set(name, handlers);
    return () => handlers.delete(typedHandler);
  }

  public subscribeAll(handler: StructifyEventHandler<StructifyEventName>): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  public async emit<TName extends StructifyEventName>(
    options: EmitEventOptions<TName>,
  ): Promise<StructifyEvent<TName>> {
    const event: StructifyEvent<TName> = {
      id: this.nextId(),
      name: options.name,
      timestamp: new Date().toISOString(),
      sessionId: options.sessionId,
      severity: options.severity ?? 'info',
      source: options.source,
      payload: options.payload,
      correlationId: options.correlationId,
    };
    this.history.push(event as StructifyEvent);

    const handlers = this.handlers.get(options.name) ?? new Set();
    for (const handler of [...handlers, ...this.allHandlers]) {
      await handler(event as StructifyEvent<StructifyEventName>);
    }
    return event;
  }

  public getHistory(): StructifyEvent[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
    this.handlers.clear();
    this.allHandlers.clear();
    this.sequence = 0;
  }

  private nextId(): string {
    this.sequence += 1;
    return `evt-${this.sequence.toString().padStart(6, '0')}`;
  }
}
