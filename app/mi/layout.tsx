// app/mi/layout.tsx
// Carcasa de la app del paciente. SOLO visual: la comprobación de sesión vive
// en cada página, no aquí, porque /mi/entrar cuelga de este mismo layout y si
// el layout exigiera sesión la puerta de entrada se rebotaría a sí misma.
//
// La barrera real es doble y ninguna de las dos está en este archivo:
//   1. proxy.ts manda a /mi/entrar a quien no tenga sesión (optimista).
//   2. Las RPCs mi_resumen()/mi_plan() devuelven null si quien llama no es un
//      paciente vinculado (autoritativa; ver la migración de identidad).

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi recuperación · RuDaMi',
  description: 'Tu plan de ejercicios, tu progreso y tu contacto con la clínica.',
  // Necesario para que iOS trate la web como app al añadirla a la pantalla de
  // inicio (la vía de instalación en iPhone, donde no hay prompt automático).
  appleWebApp: {
    capable: true,
    title: 'Mi recuperación',
    statusBarStyle: 'default',
  },
}

export const viewport = {
  themeColor: '#16181f',
  // Sin zoom máximo: la accesibilidad manda. Un paciente con dolor cervical
  // agradece poder ampliar el texto.
  width: 'device-width',
  initialScale: 1,
}

export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return <div className="mi-shell">{children}</div>
}
