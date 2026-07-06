import fs from 'fs';
import { StructifyEvent } from '../events/index.js';

export interface EventTimelineEntry {
  name: string;
  timestamp: string;
  severity: string;
  source: string;
}

export function serializeEvents(events: StructifyEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n') + (events.length > 0 ? '\n' : '');
}

export function writeEventLog(filePath: string, events: StructifyEvent[]): void {
  fs.writeFileSync(filePath, serializeEvents(events), 'utf8');
}

export function readEventLog(filePath: string): StructifyEvent[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StructifyEvent);
}

export function replayEventTimeline(events: StructifyEvent[]): EventTimelineEntry[] {
  return events.map((event) => ({
    name: event.name,
    timestamp: event.timestamp,
    severity: event.severity,
    source: event.source,
  }));
}
