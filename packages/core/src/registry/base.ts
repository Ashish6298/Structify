export interface RegistryItem {
  id: string;
  name: string;
  description: string;
  version: string;
  supportedPlatforms?: string[];
  supportedModes?: string[];
  dependencies?: string[];
  status?: 'stable' | 'experimental' | 'deprecated' | 'disabled';
  lifecycleHooks?: {
    before?: () => Promise<void> | void;
    after?: () => Promise<void> | void;
  };
}

export class Registry<T extends RegistryItem> {
  private items = new Map<string, T>();

  public register(item: T): void {
    this.validate(item);
    if (this.items.has(item.id)) {
      throw new Error(`Duplicate Registry Item ID detected: "${item.id}"`);
    }
    this.items.set(item.id, item);
  }

  public get(id: string): T {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Registry Item with ID "${id}" not found.`);
    }
    return item;
  }

  public has(id: string): boolean {
    return this.items.has(id);
  }

  public list(): T[] {
    return Array.from(this.items.values());
  }

  public clear(): void {
    this.items.clear();
  }

  public validate(item: T): void {
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      throw new Error('Registry Item must have a non-empty string ID.');
    }
    if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
      throw new Error('Registry Item must have a non-empty string name.');
    }
    if (!item.version || typeof item.version !== 'string' || item.version.trim() === '') {
      throw new Error('Registry Item must have a non-empty string version.');
    }
  }
}
