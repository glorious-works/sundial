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

// Page views, counted by GoatCounter's tracking pixel, as on the rest of glorious.works: one
// 1 x 1 image, no cookies, no script. It names only the path, never the hash, so no board
// ever leaves the browser (browsers do not send the hash, not even in the Referer header).
// Production builds only, so `next dev` counts nothing; Playwright blocks the request.
const COUNTER = "https://gloriousworks.goatcounter.com/count?p=%2Fsundial%2F&t=Sundial";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${barlow.variable} ${barlowCondensed.variable} ${leagueGothic.variable}`}>
      <body>
        {children}
        {process.env.NODE_ENV === "production" && (
          // eslint-disable-next-line @next/next/no-img-element -- a counting pixel, not an image to optimise
          <img className="counter" src={COUNTER} alt="" width={1} height={1} aria-hidden="true" />
        )}
      </body>
    </html>
  );
}
