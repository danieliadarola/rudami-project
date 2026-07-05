// app/lib/musculos.ts
// Catálogo de grupos musculares del mapa corporal + normalización del campo
// de texto libre `musculos` (español y, por si se reimporta, inglés de
// Free Exercise DB). Función pura, sin dependencias.

export type VistaCuerpo = 'frontal' | 'dorsal'

export interface GrupoMuscular {
  id: string
  nombre: string          // etiqueta en español para chips/leyenda
  vista: VistaCuerpo[]    // en qué silueta(s) se pinta
}

export const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  { id: 'cuello', nombre: 'Cuello', vista: ['frontal', 'dorsal'] },
  { id: 'trapecio', nombre: 'Trapecio', vista: ['dorsal'] },
  { id: 'deltoides', nombre: 'Hombro', vista: ['frontal', 'dorsal'] },
  { id: 'manguito', nombre: 'Manguito rotador', vista: ['dorsal'] },
  { id: 'romboides', nombre: 'Romboides', vista: ['dorsal'] },
  { id: 'pecho', nombre: 'Pectoral', vista: ['frontal'] },
  { id: 'biceps', nombre: 'Bíceps', vista: ['frontal'] },
  { id: 'triceps', nombre: 'Tríceps', vista: ['dorsal'] },
  { id: 'antebrazo', nombre: 'Antebrazo', vista: ['frontal'] },
  { id: 'abdomen', nombre: 'Abdomen', vista: ['frontal'] },
  { id: 'oblicuos', nombre: 'Oblicuos', vista: ['frontal'] },
  { id: 'dorsal_ancho', nombre: 'Dorsal ancho', vista: ['dorsal'] },
  { id: 'paravertebrales', nombre: 'Paravertebrales', vista: ['dorsal'] },
  { id: 'lumbar', nombre: 'Zona lumbar', vista: ['dorsal'] },
  { id: 'gluteo', nombre: 'Glúteo', vista: ['dorsal'] },
  { id: 'flexores_cadera', nombre: 'Flexores de cadera', vista: ['frontal'] },
  { id: 'aductores', nombre: 'Aductores', vista: ['frontal'] },
  { id: 'cuadriceps', nombre: 'Cuádriceps', vista: ['frontal'] },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales', vista: ['dorsal'] },
  { id: 'gemelos', nombre: 'Gemelos y sóleo', vista: ['dorsal'] },
  { id: 'tibial', nombre: 'Tibial anterior', vista: ['frontal'] },
  { id: 'tobillo_pie', nombre: 'Tobillo y pie', vista: ['frontal'] },
]

/** keyword (sin acentos, minúsculas) → id de grupo. El orden no importa:
 *  se buscan todas las coincidencias por subcadena. */
const KEYWORDS: [string, string][] = [
  // Cuello / cervical
  ['cuello', 'cuello'], ['cervical', 'cuello'], ['ecm', 'cuello'], ['esternocleido', 'cuello'], ['neck', 'cuello'],
  // Trapecio
  ['trapecio', 'trapecio'], ['traps', 'trapecio'],
  // Hombro
  ['deltoide', 'deltoides'], ['hombro', 'deltoides'], ['shoulder', 'deltoides'],
  // Manguito rotador
  ['manguito', 'manguito'], ['infraespinoso', 'manguito'], ['supraespinoso', 'manguito'], ['redondo menor', 'manguito'], ['subescapular', 'manguito'], ['rotator', 'manguito'],
  // Romboides / escápula
  ['romboide', 'romboides'], ['escapula', 'romboides'], ['serrato', 'romboides'], ['middle back', 'romboides'],
  // Pecho
  ['pecho', 'pecho'], ['pectoral', 'pecho'], ['chest', 'pecho'],
  // Brazo
  ['biceps', 'biceps'],
  ['triceps', 'triceps'],
  ['antebrazo', 'antebrazo'], ['muneca', 'antebrazo'], ['mano', 'antebrazo'], ['forearm', 'antebrazo'], ['wrist', 'antebrazo'],
  // Core
  ['abdomen', 'abdomen'], ['abdominal', 'abdomen'], ['transverso', 'abdomen'], ['core', 'abdomen'], ['abdominals', 'abdomen'],
  ['oblicuo', 'oblicuos'], ['obliques', 'oblicuos'],
  // Espalda
  ['dorsal ancho', 'dorsal_ancho'], ['lats', 'dorsal_ancho'], ['latissimus', 'dorsal_ancho'],
  ['paravertebral', 'paravertebrales'], ['columna', 'paravertebrales'], ['erector', 'paravertebrales'], ['espalda', 'paravertebrales'],
  ['lumbar', 'lumbar'], ['lower back', 'lumbar'],
  // Cadera / glúteo
  ['gluteo', 'gluteo'], ['piriforme', 'gluteo'], ['piramidal', 'gluteo'], ['glute', 'gluteo'], ['abductor', 'gluteo'],
  ['psoas', 'flexores_cadera'], ['flexores de cadera', 'flexores_cadera'], ['flexor de cadera', 'flexores_cadera'], ['iliopsoas', 'flexores_cadera'], ['hip flexor', 'flexores_cadera'], ['cadera', 'flexores_cadera'],
  ['aductor', 'aductores'], ['adductor', 'aductores'],
  // Pierna
  ['cuadriceps', 'cuadriceps'], ['quadriceps', 'cuadriceps'], ['quads', 'cuadriceps'],
  ['isquiotibial', 'isquiotibiales'], ['isquio', 'isquiotibiales'], ['hamstring', 'isquiotibiales'],
  ['gemelo', 'gemelos'], ['soleo', 'gemelos'], ['calves', 'gemelos'], ['calf', 'gemelos'], ['pantorrilla', 'gemelos'],
  ['tibial', 'tibial'],
  ['tobillo', 'tobillo_pie'], ['pie', 'tobillo_pie'], ['fascia plantar', 'tobillo_pie'], ['ankle', 'tobillo_pie'],
]

const sinAcentos = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Extrae los grupos musculares del texto libre (p. ej. "Glúteo, piriforme").
 *  Devuelve ids únicos en el orden del catálogo. */
export function normalizarMusculos(texto?: string | null): string[] {
  if (!texto) return []
  const t = ` ${sinAcentos(texto)} `
  const encontrados = new Set<string>()
  for (const [kw, grupo] of KEYWORDS) {
    if (t.includes(kw)) encontrados.add(grupo)
  }
  return GRUPOS_MUSCULARES.filter(g => encontrados.has(g.id)).map(g => g.id)
}

/** Etiquetas en español de una lista de ids (para chips/leyenda). */
export function nombresDeGrupos(ids: string[]): string[] {
  return GRUPOS_MUSCULARES.filter(g => ids.includes(g.id)).map(g => g.nombre)
}
