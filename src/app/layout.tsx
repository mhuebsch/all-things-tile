import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
export const metadata: Metadata = {
  title: "All Things Tile | Duluth, MN Area Custom Tile Installations",
  description: "Custom tile installations, flooring, kitchen and bathroom remodeling by David Bond in Duluth, Minnesota.",
  robots: { index: false, follow: false }, icons: { icon: "/favicon.png" }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main-content" className="skip-link">Skip to content</a><SiteHeader />{children}<SiteFooter /><div className="preview-ribbon">Development preview · Existing website unchanged</div></body></html>;
}
