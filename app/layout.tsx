import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import BottomNav from '@/components/BottomNav'
import MainContent from '@/components/MainContent'
import RegistrarServiceWorker from '@/components/RegistrarServiceWorker'
import IntroGate from '@/components/IntroGate'

export const metadata: Metadata = {
  title: {
    default: "Salurama. Verifica. Elige. Confía.",
    template: "%s | Salurama",
  },
  description: "Directorio médico en México. Encuentra especialistas, consulta su cédula profesional en SEP/CONACEM, lee reseñas de pacientes reales y agenda tu cita con confianza.",
  keywords: ["directorio médico", "citas médicas", "verificar cédula profesional", "directorio médico México", "agendar cita", "hematólogo", "Salurama"],
  metadataBase: new URL("https://salurama.com"),
  alternates: { canonical: "https://salurama.com" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://salurama.com",
    siteName: "Salurama",
    title: "Salurama: Directorio médico en México",
    description: "Directorio médico en México. Encuentra especialistas, consulta su cédula, lee reseñas y agenda citas con confianza.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Salurama - Directorio médico en México" }],
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
      <head>
        {/* Corre antes de que el navegador pinte el <body> (beforeInteractive
            -- Next.js lo inyecta en <head>, antes de hidratar), para que
            components/IntroGate.tsx nazca ya oculto por CSS cuando esta
            sesión ya vio la animación de apertura. Sin esto, cualquier
            recarga completa de la página después de la primera (ej. login
            redirige con window.location.href, no navegación de cliente de
            Next) vuelve a mostrar el overlay durante la fracción de segundo
            entre el primer pintado y que el useEffect de IntroGate corrija
            su estado -- el server nunca puede leer sessionStorage, así que
            React solo puede arreglarlo DESPUÉS de pintar. Ver la regla CSS
            correspondiente en app/globals.css. */}
        <Script id="salurama-intro-guard" strategy="beforeInteractive">
          {`
            try {
              if (sessionStorage.getItem('salurama_intro_vista') === '1') {
                document.documentElement.classList.add('intro-vista');
              }
            } catch (e) {}
          `}
        </Script>
      </head>
      <body className="antialiased bg-white text-[#111827]" style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <Navbar />
        <MainContent>
          <IntroGate>{children}</IntroGate>
        </MainContent>
        <Footer />
        <CookieBanner />
        <BottomNav />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}