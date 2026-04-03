import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from '@/components/Navbar'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: {
    default: "Salurama — Verifico, luego elijo",
    template: "%s | Salurama",
  },
  description: "Directorio médico gratuito. Verifica credenciales antes de elegir. Especialistas con cédula verificable en SEP.",
  metadataBase: new URL("https://salurama.com"),
  alternates: {
    canonical: "https://salurama.com",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://salurama.com",
    siteName: "Salurama",
    title: "Salurama — Verifico, luego elijo",
    description: "Directorio médico gratuito. Verifica credenciales antes de elegir.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Salurama — Verifico, luego elijo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Salurama — Verifico, luego elijo",
    description: "Directorio médico gratuito. Verifica credenciales antes de elegir.",
    creator: "@saluramamx",
  },
};

export const viewport: Viewport = {
  themeColor: "#3730A3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalWebPage",
              "name": "Salurama",
              "url": "https://salurama.com",
              "description": "Directorio médico gratuito. Verifica credenciales antes de elegir.",
              "inLanguage": "es-MX",
              "medicalAudience": {
                "@type": "MedicalAudience",
                "audienceType": "Patient",
              },
              "publisher": {
                "@type": "Organization",
                "name": "Salurama",
                "url": "https://salurama.com",
                "logo": "https://salurama.com/logo.png",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased bg-white text-[#1A1A2E]" style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <Navbar />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}