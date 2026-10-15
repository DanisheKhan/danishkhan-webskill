#!/usr/bin/env node
/**
 * Fails the build when code breaks the danishkhan-webskill quality rules.
 *
 * Usage:  node scripts/check-banned-patterns.mjs [srcDir]      (default: src)
 * Opt out on one line with a trailing comment:  // banned-ok: <reason>
 * (Use sparingly. Justify it in the PR. Do not weaken this script to pass.)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', 'scripts']);
const CODE = new Set(['.js', '.jsx', '.mjs', '.cjs']);
const STYLE = new Set(['.css', '.html']);

/** @type {{id:string, re:RegExp, msg:string, exts:Set<string>, level?:'error'|'warn', skip?:(file:string)=>boolean}[]} */
const RULES = [
  {
    id: 'gradient', exts: new Set([...CODE, ...STYLE]),
    re: /\bbg-gradient-|\b(?:linear|radial|conic)-gradient\(|\bbg-clip-text\b|\banimate-gradient\b/,
    msg: 'Gradients are banned (no gradient backgrounds, borders or text).',
  },
  {
    id: 'glass', exts: new Set([...CODE, ...STYLE]),
    re: /\bbackdrop-(?:blur|filter|brightness|saturate)\b|backdrop-filter\s*:/,
    msg: 'Glassmorphism (backdrop blur/filter) is banned.',
  },
  {
    id: 'heavy-shadow', exts: new Set([...CODE, ...STYLE]),
    re: /\bshadow-(?:xl|2xl)\b|\bdrop-shadow\b/,
    msg: 'Heavy shadows/glows are banned. Use a 1px border.',
  },
  {
    id: 'blur-blob', exts: new Set([...CODE, ...STYLE]),
    re: /\bblur-(?:2xl|3xl)\b|filter\s*:\s*blur\(/,
    msg: 'Blurred blobs/glows are banned.',
  },
  {
    id: 'big-radius', exts: CODE,
    re: /\brounded-(?:2xl|3xl)\b/,
    msg: 'Oversized radius is banned. Use the single token radius (`rounded`).',
  },
  {
    id: 'hover-scale', exts: CODE,
    re: /\b(?:group-)?hover:scale-/,
    msg: 'Scale-on-hover is banned. Use a small opacity change.',
  },
  {
    id: 'offscreen-x', exts: CODE,
    re: /\bx\s*:\s*(?:['"`]-?\d+(?:%|vw)['"`]|-?\d{3,}\b)/,
    msg: 'Animating from off-screen on X causes horizontal overflow. Use y (8-16px) + opacity.',
  },
  {
    id: 'viewport-width', exts: new Set([...CODE, ...STYLE]),
    re: /\b100vw\b|\bw-screen\b|\bmin-w-screen\b|-mx-\[50vw\]/,
    msg: '100vw / w-screen / full-bleed hacks cause horizontal scroll. Use w-full / 100%.',
  },
  {
    id: 'select-star', exts: CODE,
    re: /\.select\(\s*['"`]\s*\*\s*['"`]\s*[,)]/,
    msg: "select('*') is banned in production code. List the columns you need.",
  },
  {
    id: 'service-role', exts: new Set([...CODE, ...STYLE]),
    re: /service[_-]?role/i,
    msg: 'service_role must never appear in client code.',
  },
  {
    id: 'raw-hex', exts: CODE,
    re: /['"`]#[0-9a-fA-F]{3,8}['"`]|\[#[0-9a-fA-F]{3,8}\]/,
    msg: 'Raw hex colors are banned in components. Use a token (bg-bg, text-text, ...).',
  },
  {
    id: 'arbitrary-size', exts: CODE,
    re: /\b(?:w|h|min-w|min-h|max-w|max-h|p[xytblr]?|m[xytblr]?|gap|top|left|right|bottom|inset)-\[-?\d+(?:\.\d+)?(?:px|rem)\]/,
    msg: 'Arbitrary pixel/rem values are banned. Use the spacing tokens.',
  },
  {
    id: 'emoji-ui', exts: CODE,
    re: /[\u2728\u{1F680}\u26A1\u{1F525}\u{1F4A1}\u{1F389}]/u,
    msg: 'Emoji as icons/decoration is banned. Use Lucide icons or nothing.',
  },
  {
    id: 'supabase-outside-api', exts: CODE,
    re: /\bsupabase\s*\.\s*(?:from|rpc|storage|functions|channel|removeChannel)\b/,
    msg: 'Supabase data calls belong in a feature `api/` layer (or shared/lib), not in components/hooks.',
    skip: (f) => /[\\/]features[\\/][^\\/]+[\\/]api[\\/]/.test(f) || /[\\/]shared[\\/]lib[\\/]/.test(f),
  },
  {
    id: 'dangerous-html', exts: CODE, level: 'warn',
    re: /dangerouslySetInnerHTML/,
    msg: 'dangerouslySetInnerHTML: only with DOMPurify-sanitized content. Review manually.',
  },
];

const FILE_RULES = [
  // TypeScript is not allowed in src/
  (file) => (/\.(?:ts|tsx)$/.test(file)
    ? [{ line: 0, level: 'error', id: 'typescript', msg: 'TypeScript files are not allowed. Use .js/.jsx with JSDoc and zod.' }]
    : []),
];

const IMPORT_RE = /from\s+['"]@\/features\/([^/'"]+)(\/[^'"]*)?['"]|import\(\s*['"]@\/features\/([^/'"]+)(\/[^'"]*)?['"]\s*\)/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(dir, entry.name));
    } else {
      yield path.join(dir, entry.name);
    }
  }
}

function featureOf(file) {
  const m = path.relative(ROOT, file).split(path.sep);
  return m[0] === 'features' ? m[1] : null;
}
function isShared(file) {
  return path.relative(ROOT, file).split(path.sep)[0] === 'shared';
}

if (!fs.existsSync(ROOT)) {
  console.error(`check-banned-patterns: directory not found: ${ROOT}`);
  process.exit(2);
}

const problems = [];
let filesScanned = 0;

for (const file of walk(ROOT)) {
  const ext = path.extname(file);
  const rel = path.relative(process.cwd(), file);

  for (const fn of FILE_RULES) for (const p of fn(file)) problems.push({ file: rel, ...p });

  if (!CODE.has(ext) && !STYLE.has(ext)) continue;
  filesScanned++;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const myFeature = featureOf(file);

  lines.forEach((text, i) => {
    if (text.includes('banned-ok')) return;
    const trimmed = text.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    for (const rule of RULES) {
      if (!rule.exts.has(ext)) continue;
      if (rule.skip?.(file)) continue;
      if (rule.re.test(text)) {
        problems.push({ file: rel, line: i + 1, level: rule.level ?? 'error', id: rule.id, msg: rule.msg, text: trimmed.slice(0, 120) });
      }
    }

    if (CODE.has(ext)) {
      const m = text.match(IMPORT_RE);
      if (m) {
        const target = m[1] ?? m[3];
        const deep = (m[2] ?? m[4] ?? '') !== '';
        if (isShared(file)) {
          problems.push({ file: rel, line: i + 1, level: 'error', id: 'shared-imports-feature', msg: '`shared/` must not import from features.', text: trimmed.slice(0, 120) });
        } else if (deep && target !== myFeature) {
          problems.push({ file: rel, line: i + 1, level: 'error', id: 'feature-deep-import', msg: `Import features only through their index: '@/features/${target}'.`, text: trimmed.slice(0, 120) });
        }
      }
    }
  });
}

const errors = problems.filter((p) => p.level === 'error');
const warns = problems.filter((p) => p.level === 'warn');

for (const p of [...errors, ...warns]) {
  const loc = p.line ? `${p.file}:${p.line}` : p.file;
  console.log(`${p.level === 'error' ? 'ERROR' : 'warn '} [${p.id}] ${loc}\n       ${p.msg}${p.text ? `\n       > ${p.text}` : ''}`);
}
console.log(`\ncheck-banned-patterns: ${filesScanned} files scanned, ${errors.length} error(s), ${warns.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
