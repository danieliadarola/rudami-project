// RUTA LEGACY — BORRAR A MANO cuando puedas: rm -rf "app/pacientes/[id]/sesion"
// Era una versión antigua del formulario de sesión; el flujo real es
// /pacientes/[id]/episodio/[episodioId]/sesion/primera (página unificada
// con selector de modo). Nadie enlaza aquí; se deja como redirect por si
// quedara algún marcador guardado.

import { redirect } from 'next/navigation'

export default async function SesionNuevaLegacy({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/pacientes/${id}`)
}
