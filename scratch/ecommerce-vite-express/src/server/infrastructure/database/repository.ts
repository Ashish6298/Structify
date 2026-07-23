export interface Repository<T> { findById(id: string): Promise<T | null>; save(value: T): Promise<T>; }

// Implement repository adapters for mongodb with mongoose; application services must not import the database client directly.
