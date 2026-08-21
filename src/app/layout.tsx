import type { Metadata, Viewport } from "next";

import "@fontsource/dseg7-modern/400.css";
import "@fontsource/oxanium/400.css";
import "@fontsource/oxanium/500.css";
import "@fontsource/oxanium/600.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";

import "./globals.css";

const description =
  "An unofficial, fan-powered outpost where Crawlers everywhere can connect, create, and share.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hellocrawler.world"),
  title: {
    default: "hellocrawler.world — Fan-powered outpost",
    template: "%s · hellocrawler.world",
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "hellocrawler.world",
    title: "Hello, Crawler.",
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hello, Crawler.",
    description,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#151936",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
