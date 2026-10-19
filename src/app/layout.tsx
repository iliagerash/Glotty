import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glotty — A Language App for Smart People",
  description: "The learner is the curriculum. Glotty pays attention.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
