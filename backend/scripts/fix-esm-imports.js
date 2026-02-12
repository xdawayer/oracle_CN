/**
 * Post-build script: 自动为 dist/ 中所有相对 import 添加 .js 后缀。
 *
 * TypeScript 使用 moduleResolution:"bundler" 允许省略扩展名，
 * 但 Node.js ESM 运行时要求 import 必须包含完整的 .js 后缀。
 * 此脚本在 tsc 编译后运行，补全缺失的 .js 扩展名。
 *
 * 处理两种情况：
 * 1. from './foo'  → from './foo.js'     (foo.js 文件存在)
 * 2. from './core' → from './core/index.js' (core/ 目录含 index.js)
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, '..', 'dist');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.name.endsWith('.js')) {
      yield fullPath;
    }
  }
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fixImports(content, filePath) {
  const dir = dirname(filePath);
  const importRegex = /((?:from|import)\s+['"])(\.\.?\/[^'"]+?)(['"])/g;
  const matches = [...content.matchAll(importRegex)];

  if (matches.length === 0) return content;

  let result = content;
  // Process in reverse order to preserve string positions
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const [fullMatch, prefix, importPath, suffix] = match;
    const matchStart = match.index;

    // Skip if already has a file extension
    if (/\.\w+$/.test(importPath)) continue;

    const absPath = resolve(dir, importPath);

    // Check: is it a directory with index.js?
    let replacement;
    if (await exists(absPath + '.js')) {
      replacement = `${prefix}${importPath}.js${suffix}`;
    } else if (await exists(join(absPath, 'index.js'))) {
      replacement = `${prefix}${importPath}/index.js${suffix}`;
    } else {
      // Fallback: add .js (may still fail at runtime, but most likely correct)
      replacement = `${prefix}${importPath}.js${suffix}`;
    }

    result = result.slice(0, matchStart) + replacement + result.slice(matchStart + fullMatch.length);
  }

  return result;
}

let fileCount = 0;

for await (const filePath of walk(distDir)) {
  const content = await readFile(filePath, 'utf-8');
  const fixed = await fixImports(content, filePath);
  if (fixed !== content) {
    await writeFile(filePath, fixed, 'utf-8');
    fileCount++;
  }
}

console.log(`fix-esm-imports: Fixed ${fileCount} files`);
