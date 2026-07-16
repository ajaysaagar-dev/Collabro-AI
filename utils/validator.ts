import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export function normalizeNextJsPath(filePath: string): string {
  let p = filePath.trim();
  // Standardize backslashes and slashes
  p = p.replace(/\\/g, '/');
  // Remove leading slashes or dots
  p = p.replace(/^(\.\/|\/)+/, '');

  // Convert any path starting with "app/" to "src/app/" to prevent duplicate app folders
  if (p.startsWith('app/')) {
    p = 'src/' + p;
  }

  // 1. Rename any layout file inside layout/ folder to root app layout
  if (p.match(/^(src\/)?app\/layout\/[^\/]+\.(tsx|ts|jsx|js)$/i)) {
    return p.startsWith('src/') ? 'src/app/layout.tsx' : 'app/layout.tsx';
  }

  // 2. Rename any page file inside page/ folder to root app page
  if (p.match(/^(src\/)?app\/page\/[^\/]+\.(tsx|ts|jsx|js)$/i)) {
    return p.startsWith('src/') ? 'src/app/page.tsx' : 'app/page.tsx';
  }

  // 3. Rename other Pages Router legacy files if present in the project root or app
  if (p.endsWith('_app.tsx') || p.endsWith('_app.ts') || p.endsWith('_app.js') || p.endsWith('_app.jsx')) {
    return p.startsWith('src/') ? 'src/app/page.tsx' : 'app/page.tsx';
  }
  if (p.endsWith('_document.tsx') || p.endsWith('_document.ts') || p.endsWith('_document.js') || p.endsWith('_document.jsx')) {
    return p.startsWith('src/') ? 'src/app/layout.tsx' : 'app/layout.tsx';
  }

  return p;
}

export function sanitizeEnvFile(content: string): string {
  const lines = content.split('\n');
  const cleanLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Keep empty lines or comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      cleanLines.push(line);
      continue;
    }
    // Match only standard env variable declarations: e.g. KEY=VALUE
    if (trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=/)) {
      cleanLines.push(line);
    }
  }
  return cleanLines.join('\n');
}

export function parseErrorFiles(stdout: string, stderr: string): string[] {
  const output = stdout + '\n' + stderr;
  const files = new Set<string>();

  // Match typescript error paths: e.g. "src/app/page.tsx(10,15): error" or "src/app/page.tsx:10:15 - error"
  const fileRegex = /(?:src|components|lib|tests|__tests__|config|middleware)\/[^\s()]+(?:\.tsx?|\.jsx?|\.css)/gi;
  let match;
  while ((match = fileRegex.exec(output)) !== null) {
    let filePath = match[0].trim();
    // Clean up trailing colons or other punctuation
    filePath = filePath.replace(/^[()]+|[()]+$/g, '');
    if (filePath.endsWith(':')) {
      filePath = filePath.slice(0, -1);
    }
    files.add(filePath);
  }
  return Array.from(files);
}

export async function detectAndInstallMissingDependencies(
  projectDir: string,
  logs: string,
  onLog: (msg: string) => void
): Promise<boolean> {
  // Regex to match "Cannot find module 'package-name'"
  const missingModuleRegex = /Cannot find module '([^']+)'/g;
  let match;
  const packagesToInstall = new Set<string>();
  while ((match = missingModuleRegex.exec(logs)) !== null) {
    const pkg = match[1];
    // Exclude local relative imports (start with . or @)
    if (!pkg.startsWith('.') && !pkg.startsWith('@/') && !pkg.startsWith('src/')) {
      // Handle scoped packages correctly: e.g. @prisma/client or @chakra-ui/react
      const parts = pkg.split('/');
      let cleanPkg = pkg;
      if (pkg.startsWith('@')) {
        cleanPkg = parts[0] + '/' + parts[1];
      } else {
        cleanPkg = parts[0];
      }
      packagesToInstall.add(cleanPkg);
    }
  }

  if (packagesToInstall.size > 0) {
    const pkgs = Array.from(packagesToInstall).join(' ');
    onLog(`Detected missing dependencies: ${pkgs}. Installing now...`);
    try {
      await execPromise(`npm install ${pkgs}`, { cwd: projectDir });
      onLog(`Successfully installed missing dependencies: ${pkgs}`);
      return true;
    } catch (err) {
      console.error(`Failed to install missing dependencies:`, err);
    }
  }
  return false;
}
