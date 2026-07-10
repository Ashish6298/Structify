const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const cliBin = path.join(root, 'apps', 'cli', 'dist', 'index.js');
const outputDir = path.join(root, 'test-portfolio');

const config = {
  projectName: 'test-portfolio',
  version: '1.0',
  mode: 'frontend-only',
  templateId: 'portfolio-website',
  stack: {
    frontend: 'next',
    styling: 'tailwind',
    backend: 'none',
    database: 'none',
    orm: 'none',
    packageManager: 'npm',
  },
  tools: {
    docker: false,
    eslint: true,
    prettier: true,
  },
};

const configPath = path.join(root, 'test-portfolio-config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

console.log('Generating test portfolio...');
execSync(`node ${cliBin} init --config ${configPath} --output ${outputDir} --yes`, {
  cwd: root,
  stdio: 'inherit',
});

console.log('Generated successfully at test-portfolio. Installing dependencies...');
execSync('npm install', { cwd: outputDir, stdio: 'inherit' });

console.log('Running build...');
try {
  execSync('npm run build', { cwd: outputDir, stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (e) {
  console.error('Build failed:', e.message);
}
