import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const pagesRoot = path.join(srcRoot, 'pages');
const componentsRoot = path.join(srcRoot, 'components');
const featureRoot = path.join(srcRoot, 'features');

const failures = [];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) {
        return [];
      }

      return walk(fullPath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function getImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return [...source.matchAll(importPattern)]
    .map((match) => match[1] ?? match[2])
    .filter(Boolean);
}

function resolveLocalImport(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolved = path.normalize(path.resolve(path.dirname(filePath), specifier));
  return resolved.startsWith(srcRoot) ? resolved : null;
}

function pageAllowedImport(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return true;
  }

  const resolved = resolveLocalImport(filePath, specifier);
  if (!resolved) {
    return false;
  }

  const relative = toPosix(path.relative(srcRoot, resolved));
  return (
    relative.startsWith('features/') &&
    relative.split('/').length === 2
  ) || relative.startsWith('shared/') ||
    relative.startsWith('assets/') ||
    relative.startsWith('utils/');
}

if (fs.existsSync(componentsRoot)) {
  failures.push('Remove legacy src/components. Route-owned UI should live in src/features/* and reusable UI in src/shared/*.');
}

for (const filePath of walk(pagesRoot)) {
  const relativeFile = toPosix(path.relative(projectRoot, filePath));
  const imports = getImports(filePath);

  for (const specifier of imports) {
    if (specifier.includes('/components/') || specifier.startsWith('../components') || specifier.startsWith('../../components')) {
      failures.push(`${relativeFile} imports legacy components via "${specifier}".`);
      continue;
    }

    if (!pageAllowedImport(filePath, specifier)) {
      failures.push(
        `${relativeFile} imports "${specifier}". Pages should import feature public APIs, shared utilities, assets, or packages only.`,
      );
    }
  }
}

for (const filePath of walk(featureRoot)) {
  const relativeFile = toPosix(path.relative(srcRoot, filePath));
  const [, currentFeature] = relativeFile.split('/');

  for (const specifier of getImports(filePath)) {
    if (!specifier.startsWith('.')) {
      continue;
    }

    const resolved = resolveLocalImport(filePath, specifier);
    if (!resolved) {
      continue;
    }

    const relativeImport = toPosix(path.relative(srcRoot, resolved));
    const importParts = relativeImport.split('/');

    if (importParts[0] === 'features' && importParts[1] && importParts[1] !== currentFeature && importParts.length > 2) {
      failures.push(`${relativeFile} deep-imports another feature via "${specifier}". Use the feature public index instead.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Architecture verification failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Architecture verification passed.');
