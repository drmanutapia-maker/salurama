import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Salurama — Salud en tus manos",
    template: "%s | Salurama",
  },
  description: "Directorio médico gratuito. Especialistas verificados cerca de ti.",
  
  metadataBase: new URL("https://salurama.com"),
  alternates: {
    canonical: "https://salurama.com",
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
    title: "Salurama — Salud en tus manos",
    description: "Directorio médico gratuito. Especialistas verificados cerca de ti.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Salurama — Salud en tus manos",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Salurama — Salud en tus manos",
    description: "Directorio médico gratuito. Especialistas verificados cerca de ti.",
    creator: "@saluramamx",
  },
};

export const viewport: Viewport = {
  themeColor: "#3730A3",
  width: "device-width",
  initialScale: 1,
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
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalWebPage",
              "name": "Salurama",
              "url": "https://salurama.com",
              "description": "Directorio médico gratuito. Especialistas verificados cerca de ti.",
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
      <body className="antialiased bg-white text-[#1A1A2E]">
        {children}
      </body>
    </html>
  );
}