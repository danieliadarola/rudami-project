'use client'
export function PrintBtn() {
  return (
    <button onClick={() => window.print()} className="rep-print"
      style={{ width: '100%', marginTop: 22, background: '#16181f', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
      ⬇ Descargar PDF
    </button>
  )
}
