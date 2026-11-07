// Writes dist/tokens.css and dist/ui.css from the token data (src/uiCss.ts).
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: "export { tokensCss } from './tokensCss'; export { uiCss } from './uiCss';",
    resolveDir: new URL('../src', import.meta.url).pathname,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  write: false,
});
const code = result.outputFiles[0].text;
const { tokensCss, uiCss } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

const header = '/* @nostr-post/ui - generated from src/tokens.ts, do not edit */\n';
writeFileSync(new URL('../dist/tokens.css', import.meta.url), header + tokensCss());
writeFileSync(new URL('../dist/ui.css', import.meta.url), header + uiCss());
