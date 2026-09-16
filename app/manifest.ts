// app/manifest.ts
// Convención de Next 16: este archivo se sirve como /manifest.webmanifest y
// la etiqueta <link rel="manifest"> se inyecta sola. No hace falta plugin PWA.
//
// Es lo que convierte la web en app instalable:
//   Android → "Instalar aplicación" en el menú de Chrome.
//   iOS     → Compartir → "Añadir a pantalla de inicio" (Apple no ofrece
//             instalación automática; es la fricción conocida de la vía PWA).

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // El que instala es el PACIENTE. El fisio trabaja en escritorio.
    name: 'RuDaMi',
    short_name: 'RuDaMi',
    description: 'Rutinas de ejercicios, cómo hacerlos, tus sesiones y tu progreso. Con tu clínica o por tu cuenta.',
    lang: 'es-ES',
    start_url: '/mi',
    // Ámbito completo: el enlace público /r/[token] también debe abrirse
    // dentro de la app si el paciente la tiene instalada.
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1f6b5c', // --verde de la app del paciente
    categories: ['health', 'medical', 'fitness'],
    icons: [
      // Generados con sharp desde public/logo.png (16/09/2026). El maskable
      // lleva el logo al 70 % sobre el verde de la app: la zona segura de
      // Android recorta un círculo del 80 %, y sin margen se comen el logo.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
