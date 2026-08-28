'use client'
export function PrintBtn() {
  return (
    <button onClick={() => window.print()} className="rep-print"
      style={{ width: '100%', marginTop: 22, background: 'var(--ink)', color: 'var(--background)', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
      ⬇ Descargar PDF
    </button>
  )
}
