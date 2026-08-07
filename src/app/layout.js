import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted at build time and served from our own origin, replacing the
// render-blocking @import that used to sit at the top of globals.css.
// `display: swap` keeps text visible while the font settles; the variable is
// consumed by the --font-* tokens in globals.css.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-hanken",
});

export const metadata = {
  title: "Fenix Cars",
  description: "Driver registration portal for Fenix Cars.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${hankenGrotesk.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
