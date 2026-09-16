// components/paciente/Iconos.tsx
// Iconos de línea de la app del paciente. SVG inline, 0 KB de librería, y
// todos con el mismo grosor (1.8) para que la barra, las tarjetas y las listas
// se lean como una sola familia. Server-safe: no hay estado.

type P = { size?: number; className?: string }

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className,
})

export const IcoCasa = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><path d="m3 10.5 9-7 9 7V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20Z" /><path d="M9.5 21.5v-7h5v7" /></svg>
)
export const IcoRutinas = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><path d="M6 8v8M18 8v8M3.5 10v4M20.5 10v4M6 12h12" /><rect x="4" y="7" width="4" height="10" rx="1.2" /><rect x="16" y="7" width="4" height="10" rx="1.2" /></svg>
)
export const IcoCalendario = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
)
export const IcoChat = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5Z" /></svg>
)
export const IcoPerfil = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
)
export const IcoAtras = ({ size = 22, className }: P) => (
  <svg {...base(size, className)}><path d="m14.5 5.5-6.5 6.5 6.5 6.5" /></svg>
)
export const IcoChevron = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><path d="m9.5 6 6 6-6 6" /></svg>
)
export const IcoPlay = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
)
export const IcoCheck = ({ size = 14, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><path d="M20 6 9 17l-5-5" /></svg>
)
export const IcoCandado = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
)
export const IcoChispa = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" /><path d="M18.5 15c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3Z" /></svg>
)
export const IcoReloj = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
)
export const IcoSeries = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
)
export const IcoRepes = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" /><path d="M4 20v-4.5h4.5" /></svg>
)
export const IcoClinica = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M12 8v6M9 11h6M9 20.5v-3.5h6v3.5" /></svg>
)
export const IcoWhatsapp = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8.4 19Z" /><path d="M9.2 9.3c.2 2.5 2.7 5 5.3 5.3l1.2-1.3-1.9-.9-.9.8c-.8-.4-1.6-1.2-2-2l.8-.9-.9-1.9Z" /></svg>
)
export const IcoAjustes = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
)
export const IcoAyuda = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" /></svg>
)
export const IcoSalir = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M15 16l4-4-4-4M19 12H9" /></svg>
)
export const IcoEstrella = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8Z" /></svg>
)
export const IcoGrafica = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><path d="M3 20h18" /><path d="M5 16.5 10 11l3.5 3.5L19 8" /><path d="M19 12V8h-4" /></svg>
)
export const IcoCampana = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
)
export const IcoLuna = ({ size = 20, className }: P) => (
  <svg {...base(size, className)}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
)
export const IcoLlama = ({ size = 13, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 14" fill="currentColor" aria-hidden="true" className={className}><path d="M6 0C6 3 2 4.5 2 8.5a4 4 0 0 0 8 0C10 6 8.5 4.8 8 3.5 7.2 5 6.8 5.5 6 6 5.6 4 6 2 6 0Z" /></svg>
)
export const IcoMas = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><path d="M12 5v14M5 12h14" /></svg>
)
export const IcoEnviar = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><path d="M4 12 20 4l-4 16-4-7Z" /><path d="m12 13 8-9" /></svg>
)
