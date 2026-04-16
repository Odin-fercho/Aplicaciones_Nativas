import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Odenix Portal',
  description: 'Panel maestro multi-tenant — Baserow seguro',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="odenix-portal-root">
      <body>{children}</body>
    </html>
  );
}
