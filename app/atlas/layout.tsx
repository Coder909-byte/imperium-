import { Cinzel, EB_Garamond } from "next/font/google";

// Atlas-only fonts, loaded in a nested layout so they don't bloat every
// other route's bundle. Cinzel for map lettering (Roman inscriptional
// capitals), EB Garamond for the caption line.
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600"] });
const ebGaramond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["italic"] });

export default function AtlasLayout({ children }: LayoutProps<"/atlas">) {
  return (
    <div className={`${cinzel.variable} ${ebGaramond.variable}`}>{children}</div>
  );
}
