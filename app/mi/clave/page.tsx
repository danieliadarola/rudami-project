// app/mi/clave/page.tsx
// Aterrizaje del enlace de "olvidé mi contraseña".
//
// Pública en proxy.ts a propósito, igual que /mi/callback: quien llega aquí
// todavía no puede entrar, que es justo el motivo de venir. La sesión temporal
// la consigue <NuevaClave/> canjeando el código que trae la URL.

import { NuevaClave } from '@/components/paciente/NuevaClave'

export const metadata = {
  title: 'Nueva contraseña · RuDaMi',
}

export default function PaginaClave() {
  return <NuevaClave />
}
