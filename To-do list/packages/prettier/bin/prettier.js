#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function expandPatterns(patterns) {
  const files = new Set();
  for (const pattern of patterns) {
    if (pattern === '--write' || pattern === '--check') continue;
    const extMatch = pattern.match(/^\*\*\/\*\.\{([^}]+)\}$/);
    if (extMatch) {
      const extensions = extMatch[1].split(',').map((ext) => ext.trim());
      for (const file of walk(cwd)) {
        if (extensions.some((ext) => file.endsWith(`.${ext}`))) {
          files.add(file);
        }
      }
      continue;
    }
    const resolved = path.resolve(cwd, pattern);
    if (fs.existsSync(resolved)) {
      files.add(resolved);
    }
  }
  return Array.from(files);
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

function formatJson(text) {
  return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
}

function formatMarkdown(text) {
  return `${normalizeEol(text).trimEnd()}\n`;
}

function formatBlocks(text, { isHtml = false } = {}) {
  const lines = normalizeEol(text).split('\n');
  let indent = 0;
  const formatted = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      formatted.push('');
      continue;
    }
    let shouldDedent = false;
    if (isHtml) {
      shouldDedent = /^<\//.test(trimmed) || /^<!/.test(trimmed) || /^<.*\/>$/.test(trimmed);
      if (!shouldDedent && /^<[^>]+>/.test(trimmed) && trimmed.startsWith('</')) {
        shouldDedent = true;
      }
    } else {
      shouldDedent = /^(case |default|\}|\]|\)|break;)/.test(trimmed) || trimmed.startsWith('else if') && trimmed.endsWith('{');
      if (!shouldDedent && trimmed[0] === '}') {
        shouldDedent = true;
      }
    }
    if (shouldDedent) {
      indent = Math.max(indent - 1, 0);
    }
    formatted.push(`${'  '.repeat(indent)}${trimmed}`);
    let shouldIndent = false;
    if (isHtml) {
      const openTag = /^<([a-zA-Z0-9-]+)([^>]*)>$/;
      const closeTag = /^<\/(.+)>$/;
      const selfClosing = /\/>$/;
      if (openTag.test(trimmed) && !selfClosing.test(trimmed) && !closeTag.test(trimmed)) {
        shouldIndent = true;
      }
    } else {
      shouldIndent = /\{\s*$/.test(trimmed) || /\[\s*$/.test(trimmed) || /\(\s*$/.test(trimmed);
      if (!shouldIndent && trimmed.endsWith('=>')) {
        shouldIndent = true;
      }
      if (!shouldIndent && trimmed.endsWith('[')) {
        shouldIndent = true;
      }
    }
    if (shouldIndent) {
      indent += 1;
    }
  }
  return `${formatted.join('\n').trimEnd()}\n`;
}

function formatCss(text) {
  return formatBlocks(text);
}

function formatHtml(text) {
  return formatBlocks(text, { isHtml: true });
}

function formatJs(text) {
  return formatBlocks(text);
}

function formatFile(file) {
  const ext = path.extname(file);
  const original = fs.readFileSync(file, 'utf8');
  let formatted;
  try {
    if (ext === '.json') {
      formatted = formatJson(original);
    } else if (ext === '.md') {
      formatted = formatMarkdown(original);
    } else if (ext === '.css') {
      formatted = formatCss(original);
    } else if (ext === '.html') {
      formatted = formatHtml(original);
    } else {
      formatted = formatJs(original);
    }
  } catch (error) {
    console.error(`Failed to format ${file}:`, error.message);
    return false;
  }
  if (formatted !== original) {
    fs.writeFileSync(file, formatted, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const files = expandPatterns(args);
  let changed = 0;
  for (const file of files) {
    if (formatFile(file)) {
      changed += 1;
      console.log(`Formatted ${path.relative(cwd, file)}`);
    }
  }
  if (args.includes('--check') && changed > 0) {
    process.exitCode = 1;
  }
}

main();
