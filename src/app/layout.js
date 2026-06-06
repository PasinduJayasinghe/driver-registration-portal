import "./globals.css";

export const metadata = {
  title: "Fenix Cars",
  description: "Driver registration portal for Fenix Cars.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
