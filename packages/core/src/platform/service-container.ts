export type ServiceLifetime = 'singleton' | 'scoped' | 'factory';

export interface ServiceToken<T> {
  id: string;
  description?: string;
  readonly __type?: T;
}

export interface ServiceRegistration<T> {
  lifetime: ServiceLifetime;
  factory: (container: ServiceContainer) => T;
  instance?: T;
}

export function createServiceToken<T>(id: string, description?: string): ServiceToken<T> {
  return { id, description };
}

export class ServiceContainer {
  private registrations = new Map<string, ServiceRegistration<unknown>>();
  private scopedInstances = new Map<string, unknown>();

  public registerSingleton<T>(
    token: ServiceToken<T>,
    factory: (container: ServiceContainer) => T,
  ): void {
    this.registrations.set(token.id, { lifetime: 'singleton', factory });
  }

  public registerScoped<T>(
    token: ServiceToken<T>,
    factory: (container: ServiceContainer) => T,
  ): void {
    this.registrations.set(token.id, { lifetime: 'scoped', factory });
  }

  public registerFactory<T>(
    token: ServiceToken<T>,
    factory: (container: ServiceContainer) => T,
  ): void {
    this.registrations.set(token.id, { lifetime: 'factory', factory });
  }

  public resolve<T>(token: ServiceToken<T>): T {
    const registration = this.registrations.get(token.id);
    if (!registration) {
      throw new Error(`Service is not registered: ${token.id}`);
    }
    if (registration.lifetime === 'singleton') {
      registration.instance ??= registration.factory(this);
      return registration.instance as T;
    }
    if (registration.lifetime === 'scoped') {
      if (!this.scopedInstances.has(token.id)) {
        this.scopedInstances.set(token.id, registration.factory(this));
      }
      return this.scopedInstances.get(token.id) as T;
    }
    return registration.factory(this) as T;
  }

  public createScope(): ServiceContainer {
    const scope = new ServiceContainer();
    scope.registrations = this.registrations;
    return scope;
  }
}
