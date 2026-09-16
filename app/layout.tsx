import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  title: "CRM",
  description: "Gestión de clientes, proyectos, pagos y métricas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${interTight.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
