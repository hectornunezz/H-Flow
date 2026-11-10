import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { HFlowToaster } from "@/components/Toast";

const geistSans = localFont({
  src: [{ path: "../hflow-frontend/src/app/fonts/GeistVF.woff", weight: "100 900", style: "normal" }],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [{ path: "../hflow-frontend/src/app/fonts/GeistMonoVF.woff", weight: "100 900", style: "normal" }],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "H-Flow | Rendimiento en movimiento",
  description: "Plataforma de gestión y rendimiento deportivo H-Flow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {children}
        <HFlowToaster />
      </body>
    </html>
  );
}
