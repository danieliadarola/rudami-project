// app/lib/paciente/cuenta.ts
// Lo primero que hace cada página de /mi: ¿quién eres y en qué situación estás?
//
// Solo servidor. Devuelve el cliente de Supabase ya creado para que la página
// encadene sus RPCs sin volver a leer las cookies, y rebota a la puerta si no
// hay sesión (proxy.ts ya lo hace de forma optimista; esto es la garantía).

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import type { CuentaPaciente } from './tipos'

export async function cargarCuenta() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mi/entrar')

  const { data } = await supabase.rpc('mi_cuenta')
  const cuenta = (data as CuentaPaciente | null) ?? null
  if (!cuenta) redirect('/mi/entrar')

  return { supabase, user, cuenta }
}

/** "Daniel" — o la parte local del correo si aún no tenemos nombre. */
export function nombreCorto(c: Pick<CuentaPaciente, 'nombre' | 'email'>): string {
  if (c.nombre) return c.nombre.split(' ')[0]
  return (c.email ?? '').split('@')[0] || 'tú'
}
