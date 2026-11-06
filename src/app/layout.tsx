import type { Metadata } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/auth-provider";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Stand ANSUT · Ivoire Tech Forum 2026",
  description: "Inscriptions, programme, questions en direct et sondages du stand ANSUT – Ivoire Tech Forum 2026, 11-13 novembre, Sofitel Hôtel Ivoire.",
  keywords: ["ANSUT", "Ivoire Tech Forum", "ITF 2026", "service universel", "numérique", "Côte d'Ivoire"],
  authors: [{ name: "ANSUT" }],
  openGraph: {
    title: "Stand ANSUT · Ivoire Tech Forum 2026",
    description: "Connecter le présent, bâtir le futur du numérique",
    siteName: "ANSUT · ITF 2026",
    type: "website",
    locale: "fr_CI",
  },
  icons: { icon: "/logo-ansut.jpeg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${montserrat.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
