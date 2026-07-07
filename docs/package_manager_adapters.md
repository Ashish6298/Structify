# Package Manager Adapters

Adapters for executing package actions across package managers.

The repository, CI, generated next steps, generated Dockerfiles, and generated GitHub Actions workflows are npm-first and use npm commands. Compatibility adapters can still model non-default package managers internally when explicit config support is needed.

## Support

- **npm**: Uses standard npm install and save commands.
- **pnpm**: Optional compatibility adapter only. It is not the repository workflow.
