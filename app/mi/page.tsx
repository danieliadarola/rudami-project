// app/mi/page.tsx
// Portada de la app del paciente.
//
// ESTADO: esqueleto de la Fase 1A. La estructura de datos y la seguridad ya son
// las definitivas; el diseño (animaciones, sesión guiada, imágenes) llega en la
// Fase 2. Lo que se ve aquí es deliberadamente sobrio, no es la pantalla final.
//
// Server Component a propósito: los datos del paciente no tienen por qué pasar
// por el cliente, y así la primera pintura no espera a ningún fetch.

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import type { ResumenPaciente, PlanPaciente } from '@/app/lib/paciente/tipos'
import { Anillo } from '@/components/paciente/Anillo'

export const revalidate = 0

export default async function PortadaPaciente() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mi/entrar')

  // Estas RPCs resuelven la identidad por dentro (paciente_actual()): no se
  // les pasa ningún id, así que no hay nada que un cliente pueda manipular.
  const [{ data: resumen }, { data: plan }] = await Promise.all([
    supabase.rpc('mi_resumen'),
    supabase.rpc('mi_plan'),
  ])

  const r = resumen as ResumenPaciente | null

  // Sesión válida pero sin ficha vinculada: es el caso de alguien que tiene
  // cuenta en RuDaMi (p. ej. un fisio) y entra por error, o de un paciente
  // cuyo vínculo aún no se ha hecho.
  if (!r) {
    return (
      <main className="mi-vacio">
        <p className="mi-wordmark">RUDAMI</p>
        <h1>Esta cuenta todavía no está asociada a ninguna ficha</h1>
        <p className="mi-nota">
          Abre el enlace que te envió tu clínica y pulsa «Guardar mi progreso»
          para vincular tu cuenta.
        </p>
      </main>
    )
  }

  const p = plan as PlanPaciente | null
  const ejercicios = p?.ejercicios ?? []
  const hoy = r.hoy

  // Ejercicios marcados hoy. El "hoy" viene del servidor en Europe/Madrid:
  // usar la fecha del móvil rompería la cuenta al viajar de zona horaria.
  const hechosHoy = ejercicios.filter((e) =>
    (p?.checks ?? []).some((c) => c.ejercicio_id === e.id && c.fecha === hoy),
  ).length

  const cita = r.proxima_cita

  return (
    <main className="mi-portada">
      <header className="mi-top">
        <span className="mi-wordmark">RUDAMI</span>
        <span className="mi-clinica">{r.clinica?.nombre ?? ''}</span>
      </header>

      <h1 className="mi-saludo">
        Hola, <em>{r.paciente.nombre}</em>
      </h1>

      {ejercicios.length > 0 ? (
        <section className="mi-hoy">
          <Anillo
            pct={ejercicios.length ? hechosHoy / ejercicios.length : 0}
            hechos={hechosHoy}
            total={ejercicios.length}
          />
          <div>
            <p className="mi-hoy-t">Tu plan de hoy</p>
            <p className="mi-hoy-d">
              {hechosHoy === ejercicios.length
                ? 'Completado. Buen trabajo.'
                : `Te ${ejercicios.length - hechosHoy === 1 ? 'queda 1 ejercicio' : `quedan ${ejercicios.length - hechosHoy} ejercicios`}.`}
            </p>
          </div>
        </section>
      ) : (
        <p className="mi-nota">
          Tu fisioterapeuta aún no te ha publicado un plan de ejercicios.
        </p>
      )}

      {cita && (
        <section className="mi-cita">
          <span className="mi-cita-punto" style={{ background: cita.color ?? 'var(--accent)' }} />
          <div>
            <p className="mi-cita-t">Próxima cita</p>
            <p className="mi-cita-d">
              {new Date(cita.fecha_hora).toLocaleString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid',
              })}
              {cita.tipo ? ` · ${cita.tipo}` : ''}
            </p>
          </div>
        </section>
      )}

      {/* La guía completa sigue viviendo en /r/[token]. En la Fase 2 su
          contenido pasa a renderizarse aquí dentro con los componentes
          compartidos de components/paciente/, y en la 3 llega /mi/progreso.
          No se enlazan todavía para no dejar un 404 a la vista. */}

      {/* Vuelve a /mi/entrar, no a "/": el paciente no debe acabar nunca en el
          login de la clínica. El handler borra además la cookie de rol. */}
      <a className="mi-salir" href="/api/logout?next=%2Fmi%2Fentrar">Cerrar sesión</a>
    </main>
  )
}
