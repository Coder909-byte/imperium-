import Link from "next/link";
import type { ReactNode } from "react";
import { inscription } from "./fonts";
import "./shell.css";

export function Compass({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="32" r="23" stroke="currentColor" strokeWidth=".7" />
      <circle cx="32" cy="32" r="19" stroke="currentColor" strokeWidth=".5" />
      <path d="M32 1 37 27 63 32 37 37 32 63 27 37 1 32 27 27Z" stroke="currentColor" strokeWidth=".8" />
      <path d="m32 8 0 24 5-5Zm24 24H32l5 5ZM32 56V32l-5 5ZM8 32h24l-5-5Z" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
}

export function Shell({ children, account = false, authArt = false, backdrop }: { children: ReactNode; account?: boolean; authArt?: boolean; backdrop?: ReactNode }) {
  return (
    <div className={`${inscription.variable} atlas-shell ${backdrop ? "landing-shell" : ""} flex min-h-screen flex-col`}>
      {backdrop && <div className="landing-artwork">{backdrop}</div>}
      <a className="shell-skip" href="#main-content">Skip to content</a>
      <header className="shell-header shell-width flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="Imperium home" className="shell-brand flex items-center gap-3">
          <Compass className="h-8 w-8" /><span>IMPERIUM</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-6 sm:gap-9">
          <Link href="/atlas" prefetch={false}>The atlas</Link>
          <Link href="/scene/gallia" prefetch={false}>Gallia</Link>
          {account ? <Link href="/profile">Account</Link> : <Link href="/login">Log in <span aria-hidden="true">↗</span></Link>}
        </nav>
      </header>
      {children}
      <footer className="shell-footer shell-width mt-auto flex flex-col justify-between gap-5 py-7 sm:flex-row sm:items-end">
        <div><Link href="/" className="shell-brand">IMPERIUM</Link><p className="mt-2 text-xs">An atlas of places. A history of people.</p></div>
        <div className="max-w-lg text-xs leading-relaxed sm:text-right">
          {authArt ? <>
            <p>Lionel Royer, <cite>Vercingetorix before Caesar</cite>, 1899 · Musée Crozatier.</p>
            <p>A later interpretation of Alesia. <a href="https://commons.wikimedia.org/wiki/File:Lionel_Royer_-_Vercingetorix_Throwing_down_His_Weapons_at_the_feet_of_Julius_Caesar.jpg">Public-domain reproduction</a>.</p>
          </> : !account ? <>
            <p>Thomas Cole, <cite>The Consummation of Empire</cite>, 1836 · New-York Historical Society.</p>
            <p>An imagined classical city. <a href="https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Consummation_The_Course_of_the_Empire_1836.jpg">Public-domain reproduction</a>.</p>
          </> : <p>The atlas and Gallia remain open without an account.</p>}
          <p className="mt-1">Cinzel by Natanael Gama · <a href="https://github.com/google/fonts/blob/main/ofl/cinzel/OFL.txt">SIL Open Font License</a></p>
        </div>
      </footer>
    </div>
  );
}
