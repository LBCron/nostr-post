/**
 * The infobox: the Djot table of field values a wiki page made with a manifest starts with,
 * written from form data and read back into rows (and the wikilinks in them).
 */

import { type AstNode, escapeInline, nodeText } from './djotText';
import { linkTarget, type WikiLink } from './roleRefs';

export type AstDoc = {
  tag: 'doc';
  children: AstNode[];
  references: Record<string, unknown>;
  footnotes: Record<string, unknown>;
};

/** Wikilinks in a node: Djot reference links (`[text][target]`, `[target][]`) */
function extractLinks(node: AstNode): WikiLink[] {
  const reference = (node as AstNode & { reference?: unknown }).reference;
  if (node.tag === 'link' && typeof reference === 'string') {
    return [{ target: linkTarget(reference), text: nodeText(node).trim() }];
  }
  const children = node.children as AstNode[] | undefined;
  return Array.isArray(children) ? children.flatMap(extractLinks) : [];
}

export type TableRow = [key: string, value: string, links: WikiLink[]];

/** A table row whose cells only hold dashes (a separator Djot didn't recognize) */
function isDashRow(row: AstNode): boolean {
  const cells = (row as AstNode & { children?: AstNode[] }).children ?? [];
  return (
    cells.length > 0 &&
    cells.every((cell) => {
      const parts = (cell as AstNode & { children?: AstNode[] }).children ?? [];
      return (
        parts.length > 0 &&
        parts.every(
          (p) =>
            p.tag === 'smart_punctuation' ||
            (p.tag === 'str' && /^[-:\s]*$/.test(String((p as { text?: unknown }).text ?? '')))
        )
      );
    })
  );
}

export function extractTableFromAst(ast: AstDoc): { rows: TableRow[]; tableIndex: number } {
  const tableIndex = ast.children.findIndex((n) => n.tag === 'table');
  if (tableIndex === -1) return { rows: [], tableIndex: -1 };
  const table = ast.children[tableIndex] as AstNode & { children: AstNode[] };
  const bodyRows = table.children.filter((row) => {
    const cells = (row as AstNode & { children?: AstNode[] }).children;
    return !(row as AstNode & { head?: boolean }).head && !!cells && cells.length >= 2;
  });
  // Tables written before the separator fix (`| --- |`) have no head row: the
  // separator parses as a row of dashes; skip it and the header row before it.
  const separator = bodyRows.findIndex(isDashRow);
  const dataRows = separator === 1 ? bodyRows.slice(2) : bodyRows.filter((r) => !isDashRow(r));
  const rows: TableRow[] = [];
  for (const row of dataRows) {
    const cells = (row as AstNode & { children: AstNode[] }).children;
    const key = nodeText(cells[0]).trim();
    const value = nodeText(cells[1]).trim();
    if (key) rows.push([key, value, extractLinks(cells[1])]);
  }
  return { rows, tableIndex };
}

// Djot table rows are single-line: collapse line breaks and escape the cell delimiter.
// Plain values are escapeInline'd before (role rows hold wikilink markup).
const escapeCell = (v: string): string => v.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|');

export function serializeForTable(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  return JSON.stringify(value);
}

export function buildDjotTable(rows: Array<[string, string]>): string {
  if (rows.length === 0) return '';
  const escaped = rows.map(([k, v]): [string, string] => [
    escapeCell(escapeInline(k)),
    escapeCell(v),
  ]);
  const col1 = Math.max(5, ...escaped.map(([k]) => k.length));
  const col2 = Math.max(5, ...escaped.map(([, v]) => v.length));
  const pad = (s: string, n: number) => s.padEnd(n);
  // No spaces inside the separator: Djot reads `| --- |` as text, not as a header separator
  const sep = `|${'-'.repeat(col1 + 2)}|${'-'.repeat(col2 + 2)}|`;
  const header = `| ${pad('Field', col1)} | ${pad('Value', col2)} |`;
  const dataRows = escaped.map(([k, v]) => `| ${pad(k, col1)} | ${pad(v, col2)} |`);
  return [header, sep, ...dataRows].join('\n');
}
