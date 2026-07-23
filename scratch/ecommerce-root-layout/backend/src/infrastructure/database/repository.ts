export interface Repository<T> {
  find(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
