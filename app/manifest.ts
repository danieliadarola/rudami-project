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
      {
        // PENDIENTE: sustituir por 192/512 optimizados cuando esté la
        // identidad visual definitiva (Fase 2). Hoy es el logo a 1254px:
        // funciona, pero pesa 868 KB.
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
