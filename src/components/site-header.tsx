"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone } from "lucide-react";
export function FacebookIcon({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`facebook-icon ${className}`}>f</span>;
}
export function SiteHeader() {
  const path = usePathname();
  return <header className="site-header">
    <div className="contact-bar"><div className="site-width contact-bar-inner">
      <a href="tel:+12185912200"><Phone size={13} fill="currentColor" />218.591.2200</a>
      <a href="mailto:david@allthingstile.net"><Mail size={15} fill="currentColor" />david@allthingstile.net</a>
      <a className="top-facebook" href="https://www.facebook.com/allthingstile/" aria-label="All Things Tile on Facebook" target="_blank" rel="noreferrer"><FacebookIcon /></a>
    </div></div>
    <div className="main-nav"><div className="site-width nav-inner">
      <Link href="/" className="header-logo" aria-label="All Things Tile home"><img src="/images/logo.jpg" alt="All Things Tile — Custom Flooring Kitchen & Bath" width="720" height="240" /></Link>
      <nav aria-label="Main navigation"><Link href="/" aria-current={path === "/" ? "page" : undefined}>Home</Link><Link href="/contact/" aria-current={path === "/contact" || path === "/contact/" ? "page" : undefined}>Contact</Link></nav>
    </div></div>
  </header>;
}
