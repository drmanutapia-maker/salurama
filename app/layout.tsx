import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import SessionManager from '@/components/SessionManager'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: {
    default: "Salurama — Verifica. Elige. Confía.",
    template: "%s | Salurama",
  },
  description: "Directorio médico verificado. Encuentra especialistas con cédula validada en SEP y agenda con confianza.",
  metadataBase: new URL("https://salurama.com"),
  alternates: { canonical: "https://salurama.com" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://salurama.com",
    siteName: "Salurama",
    title: "Salurama — Verifica. Elige. Confía.",
    description: "Directorio médico verificado en México",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Salurama" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-white text-[#111827]" style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <Navbar />
        <main style={{ paddingTop: '68px', minHeight: '100vh' }}>
          {children}
        </main>
        <Footer />
        <CookieBanner />
        <SessionManager />
        <BottomNav />
      </body>
    </html>
  );
}