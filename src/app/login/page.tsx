'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'No se pudo iniciar sesión');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        padding: '2.5rem',
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        color: '#f9fafb',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
        Iniciar sesión
      </h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
          <span style={{ color: 'rgba(249,250,251,0.72)' }}>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 15,
              border: '1px solid rgba(155, 93, 229, 0.45)',
              background: '#161616',
              color: '#f9fafb',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
          <span style={{ color: 'rgba(249,250,251,0.72)' }}>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 15,
              border: '1px solid rgba(155, 93, 229, 0.45)',
              background: '#161616',
              color: '#f9fafb',
            }}
          />
        </label>
        {error ? (
          <p role="alert" style={{ color: '#fca5a5', margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '0.75rem',
            borderRadius: 15,
            border: 'none',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg, #9b5de5, #7c3aed)',
            color: '#fff',
            boxShadow: '0 0 28px rgba(155, 93, 229, 0.35)',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
