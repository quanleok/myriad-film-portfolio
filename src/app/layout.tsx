import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PageLoadingBar } from "@/components/ui/page-loading-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { ThemeProvider } from "@/components/theme-provider";
import { MiniPlayerProvider } from "@/contexts/MiniPlayerContext";
import { MiniPlayer } from "@/components/video/MiniPlayer";
import { isFeatureEnabled } from "@/lib/feature-flags";

const siteUrl = getSiteUrl();
const brandV2Enabled = process.env.NEXT_PUBLIC_FF_BRAND_V2 === "true";
const showMiniPlayer = !isFeatureEnabled("FF_PROJECTS_ENABLED");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Myriad Spring — AI Creators and Studios",
    template: "%s | Myriad Spring",
  },
  description:
    "Discover AI creators and studios, review their public work, and explore the serious projects they are building on Myriad Spring.",
  keywords: [
    "AI film",
    "AI movie",
    "AI filmmaking",
    "AI creator",
    "AI studio",
    "AI animation studio",
    "AI video creator",
    "AI filmmaker portfolio",
    "AI studio portfolio",
    "AI production studio",
    "AI talent discovery",
    "AI creator discovery",
    "AI short film",
    "AI film project",
    "AI generated film",
  ],
  openGraph: {
    title: "Myriad Spring — AI Creators and Studios",
    description:
      "Discover AI creators and studios, review their public work, and explore the serious projects they are building on Myriad Spring.",
    url: siteUrl,
    siteName: "Myriad Spring",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@myriadspring",
    title: "Myriad Spring — AI Creators and Studios",
    description:
      "Discover AI creators and studios, review their public work, and explore the serious projects they are building on Myriad Spring.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Myriad Spring",
              url: siteUrl,
              logo: `${siteUrl}/logo.png`,
              description:
                "AI creator and studio infrastructure for showcasing work, discovering talent, and building serious film projects.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className={`min-h-screen bg-page text-text-primary antialiased font-body ${brandV2Enabled ? "brand-v2" : ""}`}>
        <ThemeProvider>
          <AuthProvider>
            <PresenceProvider>
              <MiniPlayerProvider>
                <PageLoadingBar />
                {children}
                {showMiniPlayer ? <MiniPlayer /> : null}
                <OfflineBanner />
              </MiniPlayerProvider>
            </PresenceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
