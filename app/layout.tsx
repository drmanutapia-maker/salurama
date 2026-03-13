import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salurama — Salud en tus manos",
  description: "Directorio médico gratuito. Especialistas verificados cerca de ti.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#F3F4F6] text-[#1A1A2E]">
        {children}

        {/* FOOTER OFICIAL — Manual de Marca v1.0 */}
        <footer className="bg-[#0D5C4A] text-white py-10 text-center mt-12">
          <p className="text-sm font-medium">
            © 2026 Salurama S.A. de C.V. | Salud en tus manos
          </p>
          <div className="mt-4 flex justify-center gap-8 text-sm">
            <a
              href="/aviso-de-privacidad.html"
              className="hover:text-[#F59E0B] hover:underline transition-colors"
            >
              Aviso de Privacidad
            </a>
            <a
              href="/terminos-y-condiciones.html"
              className="hover:text-[#F59E0B] hover:underline transition-colors"
            >
              Términos y Condiciones
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}