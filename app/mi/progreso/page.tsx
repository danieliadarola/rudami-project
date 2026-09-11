// app/mi/progreso/page.tsx
// "¿Está sirviendo de algo?" — la otra mitad de la app del paciente.
// La portada es acción (qué hago hoy); esto es perspectiva (cómo voy).
//
// Server Component de punta a punta, gráficas incluidas: SVG y HTML sin un
// solo estado. Esta pantalla añade CERO JavaScript al cliente — solo pesan
// los bytes del HTML que ya viene pintado.

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import type { ProgresoPaciente } from '@/app/lib/paciente/tipos'
import { desdeIso } from '@/app/lib/paciente/fechas'
import { Revelar } from '@/components/paciente/Revelar'
import { BarraMi } from '@/components/paciente/BarraMi'
import { GraficaDolor } from '@/components/paciente/GraficaDolor'
import { AdherenciaSemanal } from '@/components/paciente/AdherenciaSemanal'
import { AntesAhora } from '@/components/paciente/AntesAhora'

export const revalidate = 0

export default async function Progreso() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mi/entrar')

  const { data } = await supabase.rpc('mi_progreso')
  const p = data as ProgresoPaciente | null

  // Cuenta sin ficha vinculada: la portada ya explica qué hacer.
  if (!p) redirect('/mi')

  const fechasDolor = new Set([
    ...p.checkins.map((c) => c.fecha),
    ...p.sesiones.filter((s) => s.dolor != null).map((s) => s.fecha),
  ])
  const hayDolor = fechasDolor.size >= 2
  const hayConstancia = p.ejercicios_dia > 0 && p.checks_por_dia.length > 0
  const hayComparativa = p.sesiones.length >= 2

  const desde = p.episodio?.fecha_inicio
    ? desdeIso(p.episodio.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    : null

  return (
    <main className="mi-portada">
      <header className="mi-top">
        <span className="mi-wordmark">RUDAMI</span>
      </header>

      <h1 className="mi-saludo">Tu progreso</h1>
      {p.episodio?.titulo && (
        <p className="pg-episodio">
          {p.episodio.titulo}
          {desde ? ` · desde el ${desde}` : ''}
          {p.episodio.estado && p.episodio.estado !== 'activo' ? ' · finalizado' : ''}
        </p>
      )}

      {!hayDolor && !hayConstancia && !hayComparativa ? (
        <section className="mi-hoy mi-hoy-vacio">
          <p className="mi-hoy-t">Todavía no hay suficiente historia</p>
          <p className="mi-hoy-d">
            Registra tu dolor cada día y marca tus ejercicios: aquí verás cómo
            evoluciona tu recuperación, junto a lo que mide tu fisioterapeuta
            en consulta.
          </p>
        </section>
      ) : (
        <>
          {hayDolor && (
            <Revelar className="mi-bloque" orden={0}>
              <h2 className="mi-label">Tu dolor</h2>
              <GraficaDolor
                checkins={p.checkins}
                sesiones={p.sesiones.map((s) => ({ fecha: s.fecha, dolor: s.dolor }))}
              />
            </Revelar>
          )}

          {hayConstancia && (
            <Revelar className="mi-bloque" orden={1}>
              <h2 className="mi-label">Tu constancia, semana a semana</h2>
              <AdherenciaSemanal
                checksPorDia={p.checks_por_dia}
                ejerciciosDia={p.ejercicios_dia}
                hoy={p.hoy}
              />
            </Revelar>
          )}

          {hayComparativa && (
            <Revelar className="mi-bloque" orden={2}>
              <h2 className="mi-label">De la primera sesión a la última</h2>
              <AntesAhora sesiones={p.sesiones} />
              <p className="pg-nota">
                Puntuado por tu fisioterapeuta en consulta, de 0 a 10.
              </p>
            </Revelar>
          )}
        </>
      )}

      <BarraMi activa="progreso" />
    </main>
  )
}
