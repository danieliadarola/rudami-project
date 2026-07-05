// components/guia/MapaMuscular.tsx
// Mapa corporal SVG propio (frontal + dorsal) al estilo v3: silueta en
// hairline y grupos musculares activos en tinta. Sin librerías.
// Se alimenta de normalizarMusculos() sobre el texto libre `musculos`.

import { GRUPOS_MUSCULARES, nombresDeGrupos } from '@/app/lib/musculos'
import type { VistaCuerpo } from '@/app/lib/musculos'

const ACTIVO = 'var(--ink)'
const REPOSO = 'rgba(22,24,31,.055)'
const CONTORNO = 'rgba(22,24,31,.22)'

/** Formas SVG de cada grupo por vista. Coordenadas sobre viewBox 0 0 110 225. */
function ZonasVista({ vista, activos }: { vista: VistaCuerpo; activos: Set<string> }) {
  const f = (id: string) => ({ fill: activos.has(id) ? ACTIVO : REPOSO, opacity: activos.has(id) ? 0.82 : 1 })
  if (vista === 'frontal') {
    return (
      <g>
        <rect x="50" y="21" width="10" height="7" rx="3" {...f('cuello')} />
        <circle cx="26" cy="33" r="5" {...f('deltoides')} />
        <circle cx="84" cy="33" r="5" {...f('deltoides')} />
        <ellipse cx="46" cy="38" rx="8" ry="5.5" {...f('pecho')} />
        <ellipse cx="64" cy="38" rx="8" ry="5.5" {...f('pecho')} />
        <ellipse cx="26" cy="52" rx="4.5" ry="8" {...f('biceps')} />
        <ellipse cx="84" cy="52" rx="4.5" ry="8" {...f('biceps')} />
        <ellipse cx="26" cy="76" rx="4" ry="10" {...f('antebrazo')} />
        <ellipse cx="84" cy="76" rx="4" ry="10" {...f('antebrazo')} />
        <rect x="47" y="47" width="16" height="28" rx="6" {...f('abdomen')} />
        <ellipse cx="40" cy="59" rx="3.6" ry="11" {...f('oblicuos')} />
        <ellipse cx="70" cy="59" rx="3.6" ry="11" {...f('oblicuos')} />
        <ellipse cx="46" cy="87" rx="5" ry="5.5" {...f('flexores_cadera')} />
        <ellipse cx="64" cy="87" rx="5" ry="5.5" {...f('flexores_cadera')} />
        <ellipse cx="51" cy="110" rx="3.6" ry="10" {...f('aductores')} />
        <ellipse cx="59" cy="110" rx="3.6" ry="10" {...f('aductores')} />
        <ellipse cx="44" cy="121" rx="6" ry="16" {...f('cuadriceps')} />
        <ellipse cx="66" cy="121" rx="6" ry="16" {...f('cuadriceps')} />
        <ellipse cx="45" cy="182" rx="4" ry="13" {...f('tibial')} />
        <ellipse cx="65" cy="182" rx="4" ry="13" {...f('tibial')} />
        <ellipse cx="43" cy="211" rx="7.5" ry="4.5" {...f('tobillo_pie')} />
        <ellipse cx="67" cy="211" rx="7.5" ry="4.5" {...f('tobillo_pie')} />
      </g>
    )
  }
  return (
    <g>
      <rect x="50" y="21" width="10" height="7" rx="3" {...f('cuello')} />
      <path d="M55 24 L39 32 Q48 37 55 47 Q62 37 71 32 Z" {...f('trapecio')} />
      <circle cx="26" cy="33" r="5" {...f('deltoides')} />
      <circle cx="84" cy="33" r="5" {...f('deltoides')} />
      <circle cx="41" cy="38" r="4" {...f('manguito')} />
      <circle cx="69" cy="38" r="4" {...f('manguito')} />
      <path d="M55 36 L48 44 L55 53 L62 44 Z" {...f('romboides')} />
      <ellipse cx="43" cy="58" rx="5" ry="10" transform="rotate(12 43 58)" {...f('dorsal_ancho')} />
      <ellipse cx="67" cy="58" rx="5" ry="10" transform="rotate(-12 67 58)" {...f('dorsal_ancho')} />
      <rect x="50" y="32" width="3.2" height="44" rx="1.6" {...f('paravertebrales')} />
      <rect x="56.8" y="32" width="3.2" height="44" rx="1.6" {...f('paravertebrales')} />
      <rect x="46" y="73" width="18" height="13" rx="5" {...f('lumbar')} />
      <ellipse cx="47" cy="97" rx="7" ry="7" {...f('gluteo')} />
      <ellipse cx="63" cy="97" rx="7" ry="7" {...f('gluteo')} />
      <ellipse cx="44" cy="124" rx="6" ry="15" {...f('isquiotibiales')} />
      <ellipse cx="66" cy="124" rx="6" ry="15" {...f('isquiotibiales')} />
      <ellipse cx="45" cy="182" rx="4.5" ry="13" {...f('gemelos')} />
      <ellipse cx="65" cy="182" rx="4.5" ry="13" {...f('gemelos')} />
      <ellipse cx="43" cy="211" rx="7.5" ry="4.5" {...f('tobillo_pie')} />
      <ellipse cx="67" cy="211" rx="7.5" ry="4.5" {...f('tobillo_pie')} />
    </g>
  )
}

/** Silueta base compartida por ambas vistas. */
function Silueta() {
  return (
    <g fill="none" stroke={CONTORNO} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="55" cy="12" r="8.5" />
      <path d="M51 20.5 L51 26 M59 20.5 L59 26" />
      {/* torso */}
      <path d="M38 28 Q32 30 32 37 L34 60 Q35 72 41 79 L41 95 L69 95 L69 79 Q75 72 76 60 L78 37 Q78 30 72 28 Z" />
      {/* brazos */}
      <path d="M32 30 Q22 32 21 42 L21 78 Q21 88 26 89 Q31 90 31 80 L31 48" />
      <path d="M78 30 Q88 32 89 42 L89 78 Q89 88 84 89 Q79 90 79 80 L79 48" />
      {/* piernas */}
      <path d="M41 95 L38 130 Q37 155 41 175 L42 200 Q42 206 44 207 M69 95 L72 130 Q73 155 69 175 L68 200 Q68 206 66 207" />
      <path d="M51 95 L52 130 Q52 150 50 170 L49 200 Q49 206 47 207 M59 95 L58 130 Q58 150 60 170 L61 200 Q61 206 63 207" />
      {/* pies */}
      <path d="M44 207 Q36 209 36 212 Q36 215 44 215 Q50 215 49 210 M66 207 Q74 209 74 212 Q74 215 66 215 Q60 215 61 210" />
    </g>
  )
}

export function MapaMuscular({
  activos,
  modo = 'completo',
  alto = 150,
  leyenda = false,
}: {
  /** ids de grupos (de normalizarMusculos) */
  activos: string[]
  /** 'mini' = una sola figura (la vista con más grupos activos); 'completo' = ambas */
  modo?: 'mini' | 'completo'
  alto?: number
  leyenda?: boolean
}) {
  const set = new Set(activos)
  if (set.size === 0) return null

  const nFrontal = GRUPOS_MUSCULARES.filter(g => set.has(g.id) && g.vista.includes('frontal')).length
  const nDorsal = GRUPOS_MUSCULARES.filter(g => set.has(g.id) && g.vista.includes('dorsal')).length
  const vistas: VistaCuerpo[] = modo === 'mini'
    ? [nDorsal > nFrontal ? 'dorsal' : 'frontal']
    : ['frontal', 'dorsal']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: modo === 'mini' ? 0 : 10 }}>
        {vistas.map(v => (
          <div key={v} style={{ textAlign: 'center' }}>
            <svg viewBox="0 0 110 225" height={alto} width={alto * 110 / 225} role="img"
              aria-label={`Zonas trabajadas (vista ${v === 'frontal' ? 'de frente' : 'de espaldas'})`}>
              <ZonasVista vista={v} activos={set} />
              <Silueta />
            </svg>
            {modo === 'completo' && (
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginTop: 2 }}>
                {v === 'frontal' ? 'Frente' : 'Espalda'}
              </div>
            )}
          </div>
        ))}
      </div>
      {leyenda && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {nombresDeGrupos(activos).map(n => (
            <span key={n} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--hair)', borderRadius: 999, padding: '2px 9px' }}>{n}</span>
          ))}
        </div>
      )}
    </div>
  )
}
