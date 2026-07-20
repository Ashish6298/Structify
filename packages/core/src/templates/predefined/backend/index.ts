import { PredefinedTemplateDefinition } from '../types.js';
import { expressRestApiTemplate } from './express-rest-api.js';
import { nestjsRestApiTemplate } from './nestjs-rest-api.js';
import { fastifyApiTemplate } from './fastify-api.js';
import { honoApiTemplate } from './hono-api.js';
import { nodeAuthApiTemplate } from './node-auth-api.js';

export const backendTemplates: PredefinedTemplateDefinition[] = [
  expressRestApiTemplate,
  nestjsRestApiTemplate,
  fastifyApiTemplate,
  honoApiTemplate,
  nodeAuthApiTemplate,
];

export * from './express-rest-api.js';
export * from './nestjs-rest-api.js';
export * from './fastify-api.js';
export * from './hono-api.js';
export * from './node-auth-api.js';
