import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H-FLOW | El fin del caos operativo",
  description:
    "SaaS B2B premium para entrenadores de élite: atletas, vídeo con IA y control de negocio en un solo flujo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Syne:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
