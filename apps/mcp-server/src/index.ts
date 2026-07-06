import { ConsoleLogger } from '@structify/logger';
import { validateStack, PACKAGE_MANAGERS, DEFAULT_CONFIG } from '@structify/core';
import { listSupportedStacks } from './tools.js';

async function main() {
  const logger = new ConsoleLogger(true);
  logger.info('=== Structify MCP Server ===');
  logger.info('Status: Under Development (Phase 3 Core Data Contracts Verified)');

  logger.info('Supported Package Managers:');
  PACKAGE_MANAGERS.forEach((pm) => {
    logger.info(` - ${pm.label} (${pm.value}): ${pm.description}`);
  });

  logger.info(`Default Target Project Mode: ${DEFAULT_CONFIG.mode}`);
  logger.info(
    `MCP Tool Surface Ready: ${Object.keys(listSupportedStacks().data ?? {}).join(', ')}`,
  );

  // Validate sanity connectivity
  const demoResult = validateStack({
    projectName: 'mcp-sanity-check',
    version: '1.0',
    stack: {
      frontend: 'next',
      backend: 'none',
      styling: 'tailwind',
      database: 'postgres',
      orm: 'prisma',
      packageManager: 'npm',
    },
  });

  logger.info(`MCP Server Core Validator Check: valid=${demoResult.valid}`);
}

main().catch((err) => {
  console.error('Fatal MCP Server Error:', err);
  process.exit(1);
});
