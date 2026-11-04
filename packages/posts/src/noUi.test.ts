import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The package's modules, without tests */
const modules = readdirSync(__dirname).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

describe('@nostr-post/posts is UI-free (AGENTS.md "Dependencies")', () => {
  it.each(modules)('%s imports no Lit, React or web entry', (file) => {
    const source = readFileSync(join(__dirname, file), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(
      imports.filter((i) => /^(lit|react)(\/|$)|\/web$|^@nostr-post\/(web|react)/.test(i ?? ''))
    ).toEqual([]);
  });

  it.each(modules)('%s touches no page (document, custom elements, elements)', (file) => {
    const source = readFileSync(join(__dirname, file), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
      ''
    );
    expect(source).not.toMatch(/\bdocument\.|\bcustomElements\b|\bHTMLElement\b|\bshadowRoot\b/);
  });
});
