import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BEBBA Healthy Food — Vos Plats santé en un clic",
  description:
    "BEBBA Healthy Food : des plats sains préparés après votre commande et livrés chez vous. Healthy, grillades, menus enfants, jus détox et programmes 30 jours.",
  keywords: ["BEBBA", "healthy food", "plats santé", "livraison", "Tunisie", "quinoa", "détox"],
  authors: [{ name: "BEBBA Healthy Food" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "BEBBA Healthy Food",
    description: "Vos Plats santé en un clic",
    siteName: "BEBBA Healthy Food",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
