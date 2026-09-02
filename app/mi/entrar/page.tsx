// app/mi/entrar/page.tsx
// Puerta de entrada del paciente. Pública a propósito: es una de las dos rutas
// de /mi que proxy.ts deja pasar sin sesión (la otra es /mi/callback).
//
// Llega aquí por dos caminos:
//   · Desde su guía /r/[token], pulsando "Guardar mi progreso" → trae ?t=token
//     y esa primera vez la cuenta se vincula a su ficha.
//   · De vuelta, ya vinculado, sin token: entonces esto es un login normal.

import { FormularioEntrar } from '@/components/paciente/FormularioEntrar'

export const metadata = {
  title: 'Entrar · Mi recuperación',
}

export default async function EntrarPaciente({
  searchParams,
}: {
  // En Next 16 searchParams es una promesa.
  searchParams: Promise<{ t?: string; error?: string }>
}) {
  const { t, error } = await searchParams

  return (
    <main className="mi-vacio">
      <p className="mi-wordmark">RUDAMI</p>
      <h1>{t ? 'Guarda tu progreso' : 'Entra en tu recuperación'}</h1>
      <p className="mi-nota">
        {t
          ? 'Con una cuenta no perderás tus marcas ni tu racha, y verás todo tu seguimiento aunque cambies de móvil.'
          : 'Te enviamos un enlace a tu correo. Sin contraseñas que recordar.'}
      </p>

      {error && (
        <p className="mi-error" role="alert">
          {error === 'no_coincide'
            ? 'Ese correo no coincide con el que tu clínica tiene en tu ficha. Prueba con otro, o pídeselo a tu fisioterapeuta.'
            : error === 'ya_reclamado'
              ? 'Esta ficha ya está asociada a otra cuenta. Habla con tu clínica.'
              : 'No hemos podido validar el enlace. Puede haber caducado: pide uno nuevo.'}
        </p>
      )}

      <FormularioEntrar token={t} />
    </main>
  )
}
