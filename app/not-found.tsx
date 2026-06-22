import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24, textAlign: 'center' }}>
      <p style={{ fontWeight: 700, fontSize: 15, letterSpacing: '.14em', color: '#16181f' }}>RUDAMI</p>
      <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: 'italic', fontSize: 40, color: '#16181f', marginTop: 18 }}>Página no encontrada</h1>
      <p style={{ fontSize: 14, color: '#707888', marginTop: 8, maxWidth: 380 }}>La página que buscas no existe o se ha movido.</p>
      <Link href="/dashboard" style={{ marginTop: 22, background: '#16181f', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '11px 18px', borderRadius: 10, textDecoration: 'none' }}>Volver al dashboard</Link>
    </div>
  )
}
