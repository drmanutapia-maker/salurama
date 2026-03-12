import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediOpen - Directorio Médico",
  description: "Encuentra médicos especialistas verificados",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}