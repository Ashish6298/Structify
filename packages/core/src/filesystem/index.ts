export * from './safe-ops.js';

export class FileSystemLayer {
  async write(_path: string, _content: string): Promise<void> {
    // Placeholder write
  }

  async read(_path: string): Promise<string> {
    // Placeholder read
    return '';
  }

  async exists(_path: string): Promise<boolean> {
    // Placeholder existence check
    return false;
  }
}
