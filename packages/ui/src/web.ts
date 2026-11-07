/**
 * @nostr-post/ui/web - Lit side of the design system
 *
 * Styles for shadow DOM (`npStyles`), the token installer and `NpElement`, the base class that
 * applies `registerStyles` overrides. The tokens, names and registry come from the main entry.
 */

export { followColorScheme } from './web/colorScheme';
export { NpElement } from './web/npElement';
export { installTokens, npBase, npPrimitives, npStyles } from './web/styles';
