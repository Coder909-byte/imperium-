import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CloudSweep } from "@/engine/transition/CloudSweep";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imperium",
  description: "An interactive historical atlas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Lives once here, not per-route — it has to survive the actual
            atlas<->scene DOM swap it's covering (PRD §8.2 / M3). */}
        <CloudSweep />
      </body>
    </html>
  );
}
