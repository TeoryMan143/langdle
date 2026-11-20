import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * The rules of `.agents/` that Biome cannot express, checked over the source
 * text. Each failure names `file:line` and what to use instead. A change to
 * one of these rules changes this file in the same change.
 */

const root = join(__dirname, '../..');
const src = join(root, 'src');

const sourceFiles = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter(file => /\.tsx?$/.test(file))
  .map(file => join(src, file));

const read = (file: string) => readFileSync(file, 'utf8').split('\n');
const where = (file: string, index: number) =>
  `${relative(root, file)}:${index + 1}`;

/* -------------------------------------------------------------------------- */
/*                                Design tokens                               */
/* -------------------------------------------------------------------------- */

/** The "Don't use" column of DESIGN_SYSTEM.md, as utilities without variants. */
const FORBIDDEN_UTILITIES: Array<[RegExp, string]> = [
  [
    /^rounded(-[trblse]{1,2})?-(none|sm|md|lg|xl|2xl|3xl|4xl|\[.+\])$/,
    'rounded-base (rounded-full for pills)',
  ],
  [/^font-(medium|semibold|bold)$/, 'font-base / font-heading'],
  [/^border(-[trblxy])?$/, 'border-2 (always 2px)'],
  [/^border-(black|gray-\d+)$/, 'border-border'],
  [/^border-border\/\d+$/, 'border-border'],
  [/^(text|bg|border)-gray-\d+$/, 'text-foreground/…, bg-secondary-background'],
  [/^text-red-(?!950$)\d+$/, 'text-danger'],
  [/^(text|bg|border)-\[#[0-9a-f]+\]$/i, 'a theme token'],
  [/^shadow-(sm|md|lg|xl|2xl)$/, 'shadow-shadow'],
];

/**
 * Where the token table does not apply: the kit itself, and the email and
 * social image templates, which restyle the tokens inline.
 */
const TOKEN_EXEMPT =
  /src\/core\/components\/ui\/|-email\.tsx$|\/emails\.tsx$|opengraph-image\.tsx$/;

/** A quoted string made only of class-like tokens: a class list, not prose. */
const STRING = /(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
const CLASS_TOKEN = /^[a-z0-9:[\]/#%.()_+!&*>~=-]+$/i;

function classLists(line: string) {
  return [...line.matchAll(STRING)]
    .map(match => match[2])
    .filter(body => !body.includes('${'))
    .map(body => body.split(/\s+/).filter(Boolean))
    .filter(
      tokens => tokens.length > 0 && tokens.every(t => CLASS_TOKEN.test(t)),
    );
}

describe('the rules of .agents/', () => {
  test('components use the design tokens (DESIGN_SYSTEM.md)', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      if (!file.endsWith('.tsx') || TOKEN_EXEMPT.test(file)) continue;

      read(file).forEach((line, index) => {
        for (const tokens of classLists(line)) {
          for (const token of tokens) {
            const utility = token.split(':').at(-1) ?? token;
            const rule = FORBIDDEN_UTILITIES.find(([re]) => re.test(utility));

            if (rule) {
              violations.push(`${where(file, index)} ${token} → ${rule[1]}`);
            }
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  test('types are exported from types.ts only (ARCHITECTURAL_SPINE.md)', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      if (file.endsWith('/types.ts')) continue;

      read(file).forEach((line, index) => {
        if (/^export (type|interface) /.test(line)) {
          violations.push(`${where(file, index)} ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  test('toasts show translated text (CONVENTIONS.md, i18n)', () => {
    const violations: string[] = [];
    // A literal first argument; a template that starts with `${t(…)}` is fine.
    const literalToast =
      /toast\.(loading|error|success|info|warning|message)\(\s*(['"]|`(?!\$\{))/;

    for (const file of sourceFiles) {
      read(file).forEach((line, index) => {
        if (literalToast.test(line)) {
          violations.push(`${where(file, index)} ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
