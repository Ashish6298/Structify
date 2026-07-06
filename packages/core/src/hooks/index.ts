import { EventBus } from '../events/index.js';

export type HookPoint =
  | 'beforeConfigNormalize'
  | 'afterConfigNormalize'
  | 'beforeValidation'
  | 'afterValidation'
  | 'beforePlanning'
  | 'afterPlanning'
  | 'beforeGeneration'
  | 'afterGeneration'
  | 'beforeTemplateRender'
  | 'afterTemplateRender'
  | 'beforeFileWrite'
  | 'afterFileWrite'
  | 'beforeDependencyResolve'
  | 'afterDependencyResolve'
  | 'beforeCommandPlan'
  | 'afterCommandPlan'
  | 'beforeRollback'
  | 'afterRollback'
  | 'beforeInspect'
  | 'afterInspect'
  | 'beforeRepair'
  | 'afterRepair';

export interface HookContext {
  sessionId: string;
  hookPoint: HookPoint;
  data: Record<string, unknown>;
  cancelled: boolean;
  cancel: (reason: string) => void;
  cancellationReason?: string;
}

export interface HookDefinition {
  id: string;
  hookPoint: HookPoint;
  description?: string;
  priority?: number;
  blocking?: boolean;
  source?: string;
  run: (context: HookContext) => Promise<void> | void;
}

export interface HookRunResult {
  cancelled: boolean;
  cancellationReason?: string;
  errors: { hookId: string; message: string }[];
}

export class HookManager {
  private hooks = new Map<HookPoint, HookDefinition[]>();

  public register(hook: HookDefinition): void {
    if (!hook.id.trim()) {
      throw new Error('Hook must have a non-empty id.');
    }
    const existing = this.hooks.get(hook.hookPoint) ?? [];
    if (existing.some((registeredHook) => registeredHook.id === hook.id)) {
      throw new Error(`Duplicate hook id "${hook.id}" for hook point "${hook.hookPoint}".`);
    }
    this.hooks.set(
      hook.hookPoint,
      [...existing, hook].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0)),
    );
  }

  public list(hookPoint?: HookPoint): HookDefinition[] {
    if (hookPoint) {
      return [...(this.hooks.get(hookPoint) ?? [])];
    }
    return Array.from(this.hooks.values()).flat();
  }

  public async run(
    hookPoint: HookPoint,
    options: {
      sessionId: string;
      data?: Record<string, unknown>;
      eventBus?: EventBus;
      source?: string;
    },
  ): Promise<HookRunResult> {
    const context: HookContext = {
      sessionId: options.sessionId,
      hookPoint,
      data: options.data ?? {},
      cancelled: false,
      cancel: (reason: string) => {
        context.cancelled = true;
        context.cancellationReason = reason;
      },
    };
    const errors: HookRunResult['errors'] = [];

    for (const hook of this.list(hookPoint)) {
      await options.eventBus?.emit({
        name: 'HookStarted',
        sessionId: options.sessionId,
        source: options.source ?? hook.source ?? 'hook-manager',
        payload: { hookPoint, hookId: hook.id },
      });
      try {
        await hook.run(context);
        await options.eventBus?.emit({
          name: 'HookFinished',
          sessionId: options.sessionId,
          source: options.source ?? hook.source ?? 'hook-manager',
          payload: { hookPoint, hookId: hook.id, cancelled: context.cancelled },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ hookId: hook.id, message });
        await options.eventBus?.emit({
          name: 'HookFailed',
          sessionId: options.sessionId,
          severity: 'error',
          source: options.source ?? hook.source ?? 'hook-manager',
          payload: { hookPoint, hookId: hook.id, error: message },
        });
        if (hook.blocking !== false) {
          context.cancel(message);
        }
      }
      if (context.cancelled) {
        break;
      }
    }

    return {
      cancelled: context.cancelled,
      cancellationReason: context.cancellationReason,
      errors,
    };
  }

  public clear(): void {
    this.hooks.clear();
  }
}
