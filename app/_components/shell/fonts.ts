import localFont from "next/font/local";

export const inscription = localFont({
  src: "./fonts/Cinzel.ttf",
  variable: "--font-inscription",
  display: "swap",
  weight: "400 900",
  fallback: ["Times New Roman"],
});
