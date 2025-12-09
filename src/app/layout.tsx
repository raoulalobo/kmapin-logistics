import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KmapIn Logistics - Gestion de Fret Multi-Modal",
  description: "Plateforme de gestion logistique pour transport routier, maritime, aérien et ferroviaire",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
