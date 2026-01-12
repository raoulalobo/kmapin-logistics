import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Faso Fret Logistics - Gestion de Fret Multi-Modal",
  description: "Plateforme de gestion logistique pour transport routier, maritime, aérien et ferroviaire",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
