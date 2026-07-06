import { describe, it, expect } from 'vitest';
import { validateStack } from './index.js';
import { normalizeConfig } from '../normalization/index.js';

describe('Validation and Normalization Tests', () => {
  describe('Project Name Validation', () => {
    it('should reject invalid project names', () => {
      const invalidNames = [
        '',
        '   ',
        'A-Capital-Letter',
        'spaces in name',
        'invalid@chars',
        '.starts-with-dot',
        '_starts-with-underscore',
      ];

      for (const name of invalidNames) {
        const result = validateStack({
          projectName: name,
          version: '1.0',
          stack: {
            frontend: 'next',
            backend: 'none',
            styling: 'tailwind',
            database: 'postgres',
            orm: 'prisma',
            packageManager: 'pnpm',
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'projectName')).toBe(true);
      }
    });

    it('should accept valid project names', () => {
      const validNames = ['my-project', 'project123', 'scoped.name', 'project_name'];

      for (const name of validNames) {
        const result = validateStack({
          projectName: name,
          version: '1.0',
          stack: {
            frontend: 'next',
            backend: 'none',
            styling: 'tailwind',
            database: 'postgres',
            orm: 'prisma',
            packageManager: 'pnpm',
          },
        });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Normalization Rules', () => {
    it('should apply correct defaults for missing configuration fields', () => {
      const result = normalizeConfig({
        projectName: 'default-test',
        version: '1.0',
        stack: {},
      });

      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config?.stack.frontend).toBe('none');
      expect(result.config?.stack.backend).toBe('none');
      expect(result.config?.stack.packageManager).toBe('npm');
      expect(result.config?.tools.eslint).toBe(true);
      expect(result.config?.tools.prettier).toBe(true);
      expect(result.config?.tools.git).toBe(true);
      expect(result.config?.tools.docker).toBe(false);
    });
  });

  describe('MVP Stack Combinations compatibility validation', () => {
    it('should validate Next.js with Tailwind CSS', () => {
      const result = validateStack({
        projectName: 'next-tailwind',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'none',
          styling: 'tailwind',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should validate Vite React with Material UI', () => {
      const result = validateStack({
        projectName: 'vite-mui',
        version: '1.0',
        stack: {
          frontend: 'vite-react',
          backend: 'none',
          styling: 'mui',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should validate Express-only backend', () => {
      const result = validateStack({
        projectName: 'express-backend',
        version: '1.0',
        stack: {
          frontend: 'none',
          backend: 'express',
          styling: 'none',
          database: 'none',
          orm: 'none',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should validate Nest-only backend', () => {
      const result = validateStack({
        projectName: 'nest-backend',
        version: '1.0',
        stack: {
          frontend: 'none',
          backend: 'nest',
          styling: 'none',
          database: 'none',
          orm: 'none',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should validate Next.js plus Express fullstack with PostgreSQL and Prisma', () => {
      const result = validateStack({
        projectName: 'fullstack-postgres',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'express',
          styling: 'tailwind',
          database: 'postgres',
          orm: 'prisma',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should validate Vite React plus Express fullstack with MongoDB and Mongoose', () => {
      const result = validateStack({
        projectName: 'fullstack-mongo',
        version: '1.0',
        stack: {
          frontend: 'vite-react',
          backend: 'express',
          styling: 'mui',
          database: 'mongodb',
          orm: 'mongoose',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid MongoDB plus Prisma combination in MVP', () => {
      const result = validateStack({
        projectName: 'invalid-mongo-prisma',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'none',
          database: 'mongodb',
          orm: 'prisma',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'PRISMA_MONGODB_INCOMPATIBLE')).toBe(true);
    });

    it('should reject invalid PostgreSQL plus Mongoose combination', () => {
      const result = validateStack({
        projectName: 'invalid-postgres-mongoose',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'none',
          database: 'postgres',
          orm: 'mongoose',
        },
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === 'MONGOOSE_REQUIRES_MONGODB' || e.code === 'POSTGRES_REQUIRES_PRISMA',
        ),
      ).toBe(true);
    });

    it('should reject invalid styling without frontend', () => {
      const result = validateStack({
        projectName: 'invalid-styling',
        version: '1.0',
        stack: {
          frontend: 'none',
          backend: 'express',
          styling: 'tailwind',
        },
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === 'BACKEND_STYLING' || e.code === 'STYLING_REQUIRES_FRONTEND',
        ),
      ).toBe(true);
    });

    it('should reject invalid ORM without database', () => {
      const result = validateStack({
        projectName: 'invalid-orm',
        version: '1.0',
        stack: {
          frontend: 'next',
          backend: 'none',
          database: 'none',
          orm: 'prisma',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'ORM_WITHOUT_DATABASE')).toBe(true);
    });

    it('should reject invalid fullstack configuration missing backend', () => {
      const result = validateStack({
        projectName: 'invalid-fullstack',
        version: '1.0',
        mode: 'fullstack',
        stack: {
          frontend: 'next',
          backend: 'none',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_MODE_STACK')).toBe(true);
    });

    it('should reject invalid empty frontend and backend selection', () => {
      const result = validateStack({
        projectName: 'invalid-empty',
        version: '1.0',
        stack: {
          frontend: 'none',
          backend: 'none',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_SELECTION')).toBe(true);
    });
  });
});
