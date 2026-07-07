import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ['@structify/core', '@structify/logger'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
