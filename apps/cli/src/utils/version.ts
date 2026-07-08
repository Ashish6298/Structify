import fs from 'fs';
import path from 'path';

interface PackageMetadata {
  name?: string;
  version?: string;
}

interface VersionResolutionOptions {
  includeRuntimeFallbacks?: boolean;
}

export function getCliVersion(startDir?: string, options: VersionResolutionOptions = {}): string {
  const packagePath = findCliPackageJson(startDir, options);
  if (!packagePath) {
    return '0.0.0';
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as PackageMetadata;
    return typeof metadata.version === 'string' && metadata.version.length > 0
      ? metadata.version
      : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function findCliPackageJson(
  startDir?: string,
  options: VersionResolutionOptions = {},
): string | undefined {
  for (const anchor of getVersionSearchAnchors(startDir, options)) {
    let current = path.resolve(anchor);
    let previous: string | undefined;

    while (current !== previous) {
      const packagePath = path.join(current, 'package.json');
      if (fs.existsSync(packagePath) && isStructifyPackage(packagePath)) {
        return packagePath;
      }

      previous = current;
      current = path.dirname(current);
    }
  }

  return undefined;
}

function getVersionSearchAnchors(
  startDir?: string,
  options: VersionResolutionOptions = {},
): string[] {
  const anchors = [startDir];

  if (options.includeRuntimeFallbacks !== false) {
    anchors.push(
      process.argv[1] ? path.dirname(process.argv[1]) : undefined,
      typeof __dirname === 'string' ? __dirname : undefined,
      process.cwd(),
    );
  }

  return [...new Set(anchors.filter((anchor): anchor is string => Boolean(anchor)))];
}

function isStructifyPackage(packagePath: string): boolean {
  try {
    const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as PackageMetadata;
    return metadata.name === 'structify-tool';
  } catch {
    return false;
  }
}
