import { NormalizedProjectConfig } from '../types/index.js';
import { EventBus } from '../events/index.js';
import { VirtualFileGraph } from './virtual-file-graph.js';

export interface PluginSandboxApi {
  readConfig: () => Readonly<NormalizedProjectConfig>;
  emitInfo: (message: string) => Promise<void>;
  addDiagnostic: (message: string) => void;
  contributeFile: (path: string, content: string, source: string) => void;
  readonly filesystem: undefined;
  readonly process: undefined;
  readonly commandExecution: undefined;
}

export function createPluginSandboxApi(options: {
  config: NormalizedProjectConfig;
  sessionId: string;
  eventBus: EventBus;
  virtualFileGraph: VirtualFileGraph;
  addDiagnostic: (message: string) => void;
}): PluginSandboxApi {
  return Object.freeze({
    readConfig: () => Object.freeze({ ...options.config }),
    emitInfo: async (message: string) => {
      await options.eventBus.emit({
        name: 'DiagnosticEmitted',
        sessionId: options.sessionId,
        source: 'plugin-sandbox',
        payload: { message, level: 'info' },
      });
    },
    addDiagnostic: options.addDiagnostic,
    contributeFile: (targetPath: string, content: string, source: string) => {
      options.virtualFileGraph.addFile({
        targetPath,
        content,
        sourceGenerator: source,
        sourceTemplate: source,
        conflictPolicy: 'error',
        dependencies: [],
        fileType: 'text',
        rollback: { deleteOnRollback: true, restoreBackup: false },
      });
    },
    filesystem: undefined,
    process: undefined,
    commandExecution: undefined,
  });
}
