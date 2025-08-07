import type { Metadata } from 'next';
import './style/globals.css';

export const metadata: Metadata = {
  title: 'Origin - The Ad-Free Video Platform',
  description: 'A nostalgic, ad-free video platform inspired by 2010–2015 YouTube, with a rebellious twist. No corporate BS. Pure content.',
  keywords: ['video platform', 'ad-free', 'content creators', 'origin', 'underground'],
  authors: [{ name: 'Origin Platform' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Origin - The Ad-Free Video Platform',
    description: 'A nostalgic, ad-free video platform with a rebellious twist.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Origin - The Ad-Free Video Platform',
    description: 'A nostalgic, ad-free video platform with a rebellious twist.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}