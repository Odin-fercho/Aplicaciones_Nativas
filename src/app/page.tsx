import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2.5rem', maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Odenix Portal Maestro</h1>
      <p style={{ lineHeight: 1.6, opacity: 0.9, marginBottom: '1.5rem' }}>
        Dashboard administrativo. El token de Baserow vive solo en el servidor; la app móvil debe
        consumir estas rutas <code>/api/*</code> o un BFF equivalente, nunca el token directo.
      </p>
      <p>
        <Link href="/login">Ir a login</Link>
        {' · '}
        <Link href="/dashboard">Dashboard</Link> (requiere sesión)
      </p>
    </main>
  );
}
