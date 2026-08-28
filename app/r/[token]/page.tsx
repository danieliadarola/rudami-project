// app/r/[token]/page.tsx — Guía de recuperación del paciente.
// Pública por token, sin login.
// El servidor resuelve el plan vía RPC informe_publico (nunca expone
// notas internas); toda la interactividad vive en <GuiaPaciente/>.

import { createClient } from '@/app/lib/supabase-server'
import { GuiaPaciente } from '@/components/guia/GuiaPaciente'

export const revalidate = 0

export default async function ReportePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('informe_publico', { p_token: token })

  if (!data || !data.informe) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--paper)', textAlign: 'center', padding: 24 }}>
        <div>
          <p style={{ fontWeight: 700, letterSpacing: '.14em', color: 'var(--ink)' }}>RUDAMI</p>
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>Esta guía no está disponible o aún no ha sido publicada.</p>
        </div>
      </div>
    )
  }

  return <GuiaPaciente data={data} token={token} />
}
