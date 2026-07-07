import { NormalizedProjectConfig, ExecutionPlan, PlanStep } from '../types/index.js';
import { ExecutionGraph } from '../execution/graph.js';
import { RollbackManager } from '../execution/rollback.js';

export function createProjectPlan(
  projectName: string,
  config: NormalizedProjectConfig,
): ExecutionPlan {
  const graph = new ExecutionGraph();
  const rm = new RollbackManager();

  // 1. Create main project folder
  const createFolderStep: PlanStep = {
    id: 'step-create-folder',
    type: 'CreateFolder',
    targetPath: `./${projectName}`,
    description: `Initialize project folder directory: ./${projectName}`,
  };
  graph.addNode(createFolderStep, []);

  rm.push({
    id: 'rollback-create-folder',
    type: 'DeleteFolder',
    targetPath: `./${projectName}`,
    description: 'Delete project folder directory',
  });

  const folderDeps = ['step-create-folder'];
  const childSteps: string[] = [];

  // 2. Initialize Git
  if (config.tools?.git) {
    const gitStep: PlanStep = {
      id: 'step-git-init',
      type: 'RunCommand',
      targetPath: `./${projectName}`,
      description: 'Initialize Git version control repository',
      commandStep: {
        commandLine: 'git init',
        cwd: `./${projectName}`,
      },
    };
    graph.addNode(gitStep, folderDeps);
    childSteps.push('step-git-init');
  }

  // 3. Scaffold deterministic project templates
  if (config.stack.frontend !== 'none' || config.stack.backend !== 'none') {
    const scaffoldStep: PlanStep = {
      id: 'step-scaffold-project',
      type: 'ScaffoldTemplate',
      targetPath: `./${projectName}`,
      description: 'Scaffold deterministic project templates and configuration files',
    };
    graph.addNode(scaffoldStep, folderDeps);
    childSteps.push('step-scaffold-project');
  }

  // 4. Write configuration manifest
  const writeManifestStep: PlanStep = {
    id: 'step-write-manifest',
    type: 'WriteFile',
    targetPath: `./${projectName}/structify.config.json`,
    description: 'Write project configuration state manifest',
  };
  graph.addNode(writeManifestStep, folderDeps);
  childSteps.push('step-write-manifest');

  // 5. Setup tooling configurations
  if (config.tools?.eslint) {
    const eslintStep: PlanStep = {
      id: 'step-eslint-config',
      type: 'WriteFile',
      targetPath: `./${projectName}/eslint.config.js`,
      description: 'Generate ESLint lint rules configuration file',
    };
    graph.addNode(eslintStep, folderDeps);
    childSteps.push('step-eslint-config');
  }

  if (config.tools?.prettier) {
    const prettierStep: PlanStep = {
      id: 'step-prettier-config',
      type: 'WriteFile',
      targetPath: `./${projectName}/.prettierrc`,
      description: 'Generate Prettier style formatter settings configuration file',
    };
    graph.addNode(prettierStep, folderDeps);
    childSteps.push('step-prettier-config');
  }

  if (config.tools?.docker) {
    const dockerStep: PlanStep = {
      id: 'step-docker-config',
      type: 'WriteFile',
      targetPath: `./${projectName}/Dockerfile`,
      description: 'Generate Docker builds containerization manifest',
    };
    graph.addNode(dockerStep, folderDeps);
    childSteps.push('step-docker-config');
  }

  // 6. Install dependencies (depends on all preceding steps)
  const installDepsStep: PlanStep = {
    id: 'step-install-dependencies',
    type: 'RunCommand',
    targetPath: `./${projectName}`,
    description: 'Install workspace dependencies using npm',
    commandStep: {
      commandLine: 'npm install',
      cwd: `./${projectName}`,
    },
  };
  graph.addNode(installDepsStep, childSteps.length > 0 ? childSteps : folderDeps);

  // Topological sorting
  const steps = graph.topologicalSort();

  return {
    projectName,
    timestamp: new Date().toISOString(),
    steps,
    rollbackSteps: rm.getReverseStack(),
  };
}
