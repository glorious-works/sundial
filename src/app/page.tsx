import type { Metadata } from "next";
import { Sundial } from "@/components/Sundial";

const PAGE_URL = "https://glorious.works/sundial/";
const DESCRIPTION = "A time zone board where every row keeps its own date and every strip is coloured by the real sun over that city.";

// The page's address and link preview, as the rest of glorious.works has them: here rather than in
// the layout, so the 404 page does not claim this address. The image is opengraph-image.png beside
// this file, a copy of the master in glorious-works/brand (logo/sundial/). The address never carries
// a board: that is in the hash.
export const metadata: Metadata = {
  alternates: { canonical: PAGE_URL },
  openGraph: { siteName: "Glorious Works", title: "Sundial", description: DESCRIPTION, url: PAGE_URL, locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image", title: "Sundial", description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sundial",
  description: DESCRIPTION,
  url: PAGE_URL,
  mainEntityOfPage: "https://glorious.works/works/sundial/",
  codeRepository: "https://github.com/glorious-works/sundial",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  inLanguage: "en-GB",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
  publisher: {
    "@type": "Organization",
    "@id": "https://glorious.works/#organization",
    name: "Glorious Works",
    url: "https://glorious.works/",
    logo: "https://glorious.works/apple-touch-icon.png",
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Sundial />
    </>
  );
}
