import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H-FLOW | Rendimiento en movimiento",
  description: "Plataforma de gestión y rendimiento deportivo H-FLOW.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
