// app/mi/progreso/page.tsx
// "¿Está sirviendo de algo?" — la perspectiva, frente al inicio, que es acción.
//
// Server Component de punta a punta, gráficas incluidas: SVG y HTML sin un
// solo estado. Cero JavaScript de cliente propio.
//
// Dos públicos:
//   · Paciente de clínica  → mi_progreso(): dolor, constancia y métricas del fisio.
//   · Usuario independiente → su constancia (mi_dias_ejercicio) sobre sus programas.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import type { ProgresoPaciente, TarjetaPrograma } from '@/app/lib/paciente/tipos'
import { desdeIso } from '@/app/lib/paciente/fechas'
import { Revelar } from '@/components/paciente/Revelar'
import { BarraMi } from '@/components/paciente/BarraMi'
import { Cabecera } from '@/components/paciente/Cabecera'
import { GraficaDolor } from '@/components/paciente/GraficaDolor'
import { AdherenciaSemanal } from '@/components/paciente/AdherenciaSemanal'
import { AntesAhora } from '@/components/paciente/AntesAhora'

export const revalidate = 0

export default async function Progreso() {
  const { supabase, cuenta } = await cargarCuenta()

  if (cuenta.tipo !== 'clinica') {
    const [{ data: dias }, { data: rutinas }] = await Promise.all([
      supabase.rpc('mi_dias_ejercicio'),
      supabase.rpc('mi_rutinas'),
    ])
    const checksPorDia = (dias as { fecha: string; hechos: number }[] | null) ?? []
    const ejerciciosDia = ((rutinas as TarjetaPrograma[] | null) ?? [])
      .filter((r) => r.activo).reduce((n, r) => n + r.n_ejercicios, 0)

    return (
      <main className="mi-portada ap-pagina">
        <Cabecera titulo="Tu progreso" atras="/mi/perfil" grande />
        {checksPorDia.length > 0 && ejerciciosDia > 0 ? (
          <Revelar className="mi-bloque" orden={0}>
            <h2 className="mi-label">Tu constancia, semana a semana</h2>
            <AdherenciaSemanal checksPorDia={checksPorDia} ejerciciosDia={ejerciciosDia} hoy={cuenta.hoy} />
            <p className="pg-nota">Sobre los ejercicios de tus rutinas activas.</p>
          </Revelar>
        ) : (
          <section className="mi-hoy mi-hoy-vacio">
            <p className="mi-hoy-t">Todavía no hay suficiente historia</p>
            <p className="mi-hoy-d">Activa una rutina y marca tus ejercicios: aquí verás tu constancia semana a semana.</p>
          </section>
        )}
        <BarraMi activa="perfil" />
      </main>
    )
  }

  const { data } = await supabase.rpc('mi_progreso')
  const p = data as ProgresoPaciente | null

  const fechasDolor = new Set([
    ...(p?.checkins ?? []).map((c) => c.fecha),
    ...(p?.sesiones ?? []).filter((s) => s.dolor != null).map((s) => s.fecha),
  ])
  const hayDolor = fechasDolor.size >= 2
  const hayConstancia = !!p && p.ejercicios_dia > 0 && p.checks_por_dia.length > 0
  const hayComparativa = !!p && p.sesiones.length >= 2

  const desde = p?.episodio?.fecha_inicio
    ? desdeIso(p.episodio.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    : null

  return (
    <main className="mi-portada ap-pagina">
      <Cabecera titulo="Tu progreso" atras="/mi/perfil" grande />
      {p?.episodio?.titulo && (
        <p className="pg-episodio" style={{ marginTop: -8 }}>
          {p.episodio.titulo}
          {desde ? ` · desde el ${desde}` : ''}
          {p.episodio.estado && p.episodio.estado !== 'activo' ? ' · finalizado' : ''}
        </p>
      )}

      {!p || (!hayDolor && !hayConstancia && !hayComparativa) ? (
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
              <AdherenciaSemanal checksPorDia={p.checks_por_dia} ejerciciosDia={p.ejercicios_dia} hoy={p.hoy} />
            </Revelar>
          )}

          {hayComparativa && (
            <Revelar className="mi-bloque" orden={2}>
              <h2 className="mi-label">De la primera sesión a la última</h2>
              <AntesAhora sesiones={p.sesiones} />
              <p className="pg-nota">Puntuado por tu fisioterapeuta en consulta, de 0 a 10.</p>
            </Revelar>
          )}
        </>
      )}

      <BarraMi activa="perfil" />
    </main>
  )
}
