import type { Metadata } from 'next';
import Script from 'next/script';
import '@nostr-post/ui/ui.css';
import './creator.css';

export const metadata: Metadata = {
  title: 'Manifest Creator - nostr-post',
  description: 'Visual tool for creating and testing Nostr post manifests',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* nostr-shard-signer sign-in, loaded after hydration (it injects its widget into the DOM).
            Without a client ID: Nostr-only sign-in (extension, NIP-46 bunker). Set
            NEXT_PUBLIC_WEB3AUTH_CLIENT_ID to add Google/Apple/X: https://saintego.github.io/nostr-shard-signer/portal/ */}
        <Script
          src="https://saintego.github.io/nostr-shard-signer/nostr-bridge.js"
          data-client-id={process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? ''}
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
