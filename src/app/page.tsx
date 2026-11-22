import type { Metadata } from "next";
import { Sundial } from "@/components/Sundial";

const PAGE_URL = "https://glorious.works/sundial/";
const DESCRIPTION = "A time zone board where every row keeps its own date and every strip is coloured by the real sun over that city.";

// The page's address and link preview, as the rest of glorious.works has them: here rather than in
// the layout, so the 404 page does not claim this address. Text only until Sundial has a share
// image of its own (made in glorious-works/brand). The address never carries a board: that is in the hash.
export const metadata: Metadata = {
  alternates: { canonical: PAGE_URL },
  openGraph: { siteName: "Glorious Works", title: "Sundial", description: DESCRIPTION, url: PAGE_URL, locale: "en_GB", type: "website" },
  twitter: { card: "summary", title: "Sundial", description: DESCRIPTION },
};

export default function Home() {
  return <Sundial />;
}
