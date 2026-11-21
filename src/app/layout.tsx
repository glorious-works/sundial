import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, League_Gothic } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font, so the page makes no font requests to Google.
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-barlow-condensed" });
const leagueGothic = League_Gothic({ subsets: ["latin"], weight: "400", variable: "--font-league-gothic" });

export const metadata: Metadata = {
  title: "Sundial",
  description: "A time zone board where every row keeps its own date and every strip is coloured by the real sun over that city.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${barlow.variable} ${barlowCondensed.variable} ${leagueGothic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
