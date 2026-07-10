const fs = require('fs');
const os = require('os');
const path = require('path');
const { analyzeProject, createArchitectureView } = require('./packages/core/dist/index.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'structify-inspect-'));
fs.mkdirSync(path.join(dir, 'apps', 'web', 'src', 'app'), { recursive: true });
fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"tree-app"}');
fs.writeFileSync(path.join(dir, 'README.md'), '# Tree App');
fs.writeFileSync(path.join(dir, 'apps/web/package.json'), '{"name":"web"}');
fs.writeFileSync(
  path.join(dir, 'apps/web/src/app/page.tsx'),
  'export default function Page() { return null; }',
);
fs.writeFileSync(path.join(dir, 'apps/web/next.config.ts'), 'export default {};');
const analysis = analyzeProject(dir);
const view = createArchitectureView(analysis, 'architectural');
console.log(JSON.stringify(view.sections, null, 2));
