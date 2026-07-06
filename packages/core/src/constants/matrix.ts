export const COMPATIBILITY_MATRIX = {
  // Styling compatibility with Frontends
  stylingWithFrontend: {
    next: ['tailwind', 'mui', 'none'],
    'vite-react': ['tailwind', 'mui', 'none'],
    none: ['none'],
  },

  // ORM compatibility with Databases
  ormWithDatabase: {
    postgres: ['prisma', 'none'],
    mongodb: ['mongoose', 'prisma', 'none'],
    none: ['none'],
  },

  // Project Mode stack requirements
  modes: {
    'frontend-only': {
      requiresFrontend: true,
      requiresBackend: false,
      disallowedTools: [],
    },
    'backend-only': {
      requiresFrontend: false,
      requiresBackend: true,
      disallowedTools: ['tailwind', 'mui'], // Styling not allowed
    },
    fullstack: {
      requiresFrontend: true,
      requiresBackend: true,
      disallowedTools: [],
    },
  },
} as const;
