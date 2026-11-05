import Script from "next/script";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./glow.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://returnroute.site"),
  applicationName: "ReturnRoute",
  openGraph: { siteName: "ReturnRoute", url: "https://returnroute.site", type: "website" },
  title: { default: "ReturnRoute — AI-native returns recovery", template: "%s · ReturnRoute" },
  description:
    "ReturnRoute helps retailers and fulfilment operators inspect returned products and route them to the highest-value recovery path — with human approval on every consequential decision.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Script src="/glow.js" strategy="afterInteractive" />
        <script type="application/ld+json" id="founders-ld" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Organization\", \"name\": \"ReturnRoute\", \"url\": \"https://returnroute.site\", \"email\": \"hello@returnroute.site\", \"logo\": \"https://returnroute.site/icon-512.png\", \"founder\": [{\"@type\": \"Person\", \"name\": \"Ademide Daniel\", \"jobTitle\": \"Founder/CEO\"}, {\"@type\": \"Person\", \"name\": \"Halima Bello\", \"jobTitle\": \"Co-founder/CTO\"}]}" }} />{children}</body>
    </html>
  );
}
