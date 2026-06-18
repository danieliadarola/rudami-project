// app/lib/whatsapp.ts — Helpers para el MVP gratuito de avisos por WhatsApp (wa.me).
// No usa API de pago: abre WhatsApp con el mensaje prerredactado para que el fisio lo envíe.

/** Normaliza un teléfono a solo dígitos con prefijo de país (España por defecto). */
export function normalizarTelefono(tel?: string | null, prefijoPais = '34'): string | null {
  if (!tel) return null
  let d = tel.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9) d = prefijoPais + d          // móvil/fijo español sin prefijo
  return d
}

export function whatsappLink(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
}

/** Mensaje de recordatorio/confirmación de cita. */
export function mensajeCita(opts: { nombre?: string; fechaISO: string; tipo?: string }): string {
  const f = new Date(opts.fechaISO)
  const fecha = f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const tipo = opts.tipo ? ` (${opts.tipo})` : ''
  return `Hola ${opts.nombre ?? ''}, te recordamos tu cita de fisioterapia el ${fecha} a las ${hora}${tipo}. `
    + `Por favor, confírmanos tu asistencia respondiendo a este mensaje. ¡Gracias!`
}
