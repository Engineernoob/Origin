import type { Metadata } from "next";
import "./style/globals.css";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";

export const metadata: Metadata = {
  title: "Origin - The Ad-Free Video Platform",
  description:
    "A nostalgic, ad-free video platform inspired by 2010–2015 YouTube, with a rebellious twist. No corporate BS. Pure content.",
  keywords: [
    "video platform",
    "ad-free",
    "content creators",
    "origin",
    "underground",
  ],
  authors: [{ name: "Origin Platform" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "Origin - The Ad-Free Video Platform",
    description: "A nostalgic, ad-free video platform with a rebellious twist.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Origin - The Ad-Free Video Platform",
    description: "A nostalgic, ad-free video platform with a rebellious twist.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex">
            <Sidebar isOpen={false} />
            <div className="flex-1 ml-64">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
