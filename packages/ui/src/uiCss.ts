import { primitivesCss } from './primitivesCss';
import { tokensCss } from './tokensCss';

/** Tokens and primitives in one stylesheet, as shipped in `@nostr-post/ui/ui.css` */
export const uiCss = (): string => `${tokensCss()}\n${primitivesCss()}`;
