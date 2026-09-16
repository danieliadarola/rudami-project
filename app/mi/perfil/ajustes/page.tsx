// app/mi/perfil/ajustes/page.tsx
// Datos personales y preferencias. Lo que el paciente puede cambiar por sí
// mismo es poco a propósito: el nombre (solo si no lo gestiona su clínica),
// el tema, y poco más. Su correo es su identidad y no se toca desde aquí.

import { cargarCuenta } from '@/app/lib/paciente/cuenta'
import { Ajustes } from '@/components/paciente/Ajustes'

export const revalidate = 0

export default async function PaginaAjustes() {
  const { cuenta } = await cargarCuenta()
  return <Ajustes cuenta={cuenta} />
}
