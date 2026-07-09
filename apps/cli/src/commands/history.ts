import path from 'path';
import { CLIContext } from '../context.js';
import { CLIOutput } from '../utils/output.js';
import { StructifyCLIError } from '../utils/error.js';
import { readHistory, HistoryEntry } from '@structify/core';

export interface HistoryOptions {
  json?: boolean;
  limit?: string;
  since?: string;
  path?: string;
}

export async function handleHistory(
  options: HistoryOptions,
  context: CLIContext,
): Promise<void> {
  const output = new CLIOutput(context);
  const projectPath = path.resolve(context.cwd, options.path ?? '.');

  const history = readHistory(projectPath);

  // Filter by since
  let filtered = history;
  if (options.since) {
    const sinceTime = new Date(options.since).getTime();
    if (isNaN(sinceTime)) {
      throw new StructifyCLIError('USAGE_ERROR', `Invalid ISO date format for --since: "${options.since}"`);
    }
    filtered = filtered.filter((entry) => new Date(entry.timestamp).getTime() >= sinceTime);
  }

  // Filter/slice by limit
  if (options.limit) {
    const limitNum = parseInt(options.limit, 10);
    if (isNaN(limitNum) || limitNum <= 0) {
      throw new StructifyCLIError('USAGE_ERROR', `Invalid number format for --limit: "${options.limit}"`);
    }
    filtered = filtered.slice(-limitNum);
  }

  // Handle JSON output
  if (context.json || options.json) {
    output.json(filtered);
    return;
  }

  output.heading('Structify Project History Timeline');

  if (filtered.length === 0) {
    output.info('No history entries matching criteria recorded yet.');
    return;
  }

  filtered.forEach((entry, index) => {
    // Print summary
    output.info(`[${entry.status.toUpperCase()}] ${entry.summary}`);
    
    // Print details if verbose/debug is set or just generally
    if (context.verbose) {
      output.info(`  Operation: ${entry.operation}`);
      output.info(`  Timestamp: ${entry.timestamp}`);
      output.info(`  Duration: ${entry.duration}ms`);
      output.info(`  Files Changed: ${entry.filesChanged.join(', ') || 'none'}`);
    }

    if (index < filtered.length - 1) {
      output.info('  ↓');
    }
  });

  output.showFooter('history');
}
