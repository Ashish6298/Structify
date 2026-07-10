import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  operation: string;
  status: 'success' | 'failed';
  duration: number;
  filesChanged: string[];
  version: string;
  summary: string;
  details?: Record<string, unknown>;
}

const HISTORY_FILE = 'history.json';
const STRUCTIFY_DIR = '.structify';

function getHistoryPath(projectPath: string): string {
  return path.join(projectPath, STRUCTIFY_DIR, HISTORY_FILE);
}

export function readHistory(projectPath: string): HistoryEntry[] {
  const filePath = getHistoryPath(projectPath);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function appendHistoryEntry(
  projectPath: string,
  entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'version'>,
  cliVersion: string = '1.0.1',
): HistoryEntry {
  const dirPath = path.join(projectPath, STRUCTIFY_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const history = readHistory(projectPath);
  const fullEntry: HistoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    version: cliVersion,
    ...entry,
  };

  history.push(fullEntry);
  fs.writeFileSync(getHistoryPath(projectPath), JSON.stringify(history, null, 2), 'utf8');
  return fullEntry;
}
