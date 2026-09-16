// app/mi/entrar/page.tsx
// Puerta de entrada del paciente. Pública a propósito: es una de las dos rutas
// de /mi que proxy.ts deja pasar sin sesión (la otra es /mi/callback).
//
// Llega aquí por tres caminos:
//   · Desde su guía /r/[token], pulsando "Guardar mi progreso" → trae ?t=token
//     y esa primera vez la cuenta se vincula a su ficha de clínica.
//   · Como usuario sin clínica que quiere crear cuenta (?nuevo=1 o el botón).
//   · De vuelta, ya con cuenta, sin nada: entonces esto es un login normal.

import { Bienvenida } from '@/components/paciente/Bienvenida'

export const metadata = {
  title: 'Entrar · RuDaMi',
}

export default async function EntrarPaciente({
  searchParams,
}: {
  // En Next 16 searchParams es una promesa.
  searchParams: Promise<{ t?: string; error?: string; nuevo?: string }>
}) {
  const { t, error, nuevo } = await searchParams

  return (
    <main className="ap-bienvenida">
      <section className="ap-hero-verde" aria-hidden="true">
        <div className="figura">
          {/* Ilustración propia de la biblioteca (trazo de línea, sin licencias). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ejercicios/gato-camello.svg" alt="" />
        </div>
        <p className="ap-hero-marca">RUDAMI</p>
        <p className="ap-hero-t">Tu recuperación, <em>contigo</em></p>
        <p className="ap-hero-d">Rutinas de ejercicios, cómo hacerlos, tus sesiones y tu progreso. Con tu clínica o por tu cuenta.</p>
      </section>

      <Bienvenida token={t} error={error} nuevo={nuevo === '1'} />
    </main>
  )
}
