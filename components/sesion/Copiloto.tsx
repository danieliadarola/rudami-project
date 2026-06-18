'use client'
// Panel de copiloto clínico en vivo (sugerencias mientras se rellena la sesión).

interface CopilotoData {
  hipotesis_principal?: string
  clasificacion_dolor?: string
  fase_clinica?: string
  irritabilidad?: string
  tejidos_implicados?: string[]
  diagnostico_diferencial?: string[]
  red_flags?: string[]
  yellow_flags?: string[]
  derivacion?: boolean
  derivacion_motivo?: string
  tests_sugeridos?: string[]
  preguntas_sugeridas?: { pregunta: string; campo: string }[]
  nivel_alerta?: string
  razonamiento_clinico?: string
}

const ALERTA: Record<string, { c: string; t: string }> = {
  verde:    { c: '#10b981', t: 'Sin alertas' },
  amarillo: { c: '#d97706', t: 'Requiere atención' },
  rojo:     { c: '#dc2626', t: 'Alerta clínica' },
}

const Chip = ({ children, color = 'var(--ink-2)' }: { children: React.ReactNode; color?: string }) => (
  <span style={{ fontSize: 11.5, fontWeight: 500, padding: '3px 9px', borderRadius: 999, background: 'var(--paper-2)', border: '1px solid var(--hair)', color }}>{children}</span>
)

const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div style={{ paddingTop: 14, marginTop: 14, borderTop: '1px solid var(--hair-s)' }}>
    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 8 }}>{titulo}</p>
    {children}
  </div>
)

export function Copiloto({ data, analizando, onPregunta }: { data: CopilotoData | null; analizando: boolean; onPregunta?: (campo: string) => void }) {
  const alerta = data?.nivel_alerta ? ALERTA[data.nivel_alerta] : null
  const peligro = !!data && (data.nivel_alerta === 'rojo' || (data.red_flags?.length ?? 0) > 0)

  return (
    <aside className={`copiloto-panel${peligro ? ' alerta' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 14 }}>✦</span> Copiloto clínico
        </span>
        {analizando
          ? <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>analizando…</span>
          : alerta && <span style={{ fontSize: 11.5, fontWeight: 600, color: alerta.c, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: alerta.c }} />{alerta.t}</span>}
      </div>

      {peligro && (
        <div style={{ marginTop: 12, padding: '8px 11px', borderRadius: 9, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>
          ⚠ Posibles signos de alarma — revisa las red flags y valora derivación.
        </div>
      )}

      {!data && (
        <p style={{ fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.55, marginTop: 14 }}>
          {analizando ? 'Procesando los datos clínicos…' : 'Escribe el motivo y la exploración y el copiloto sugerirá hipótesis, banderas y preguntas relevantes.'}
        </p>
      )}

      {data && (
        <div style={{ marginTop: 4 }}>
          {data.hipotesis_principal && (
            <Bloque titulo="Hipótesis principal">
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{data.hipotesis_principal}</p>
            </Bloque>
          )}

          {(data.clasificacion_dolor || data.fase_clinica || data.irritabilidad) && (
            <Bloque titulo="Clasificación">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.clasificacion_dolor && <Chip>{data.clasificacion_dolor}</Chip>}
                {data.fase_clinica && <Chip>{data.fase_clinica}</Chip>}
                {data.irritabilidad && <Chip>irritabilidad {data.irritabilidad}</Chip>}
              </div>
            </Bloque>
          )}

          {data.tejidos_implicados?.length ? (
            <Bloque titulo="Tejidos implicados">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{data.tejidos_implicados.map((t, i) => <Chip key={i}>{t}</Chip>)}</div>
            </Bloque>
          ) : null}

          {data.diagnostico_diferencial?.length ? (
            <Bloque titulo="Diagnóstico diferencial">
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {data.diagnostico_diferencial.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </Bloque>
          ) : null}

          {data.red_flags?.length ? (
            <Bloque titulo="🚩 Red flags">
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#b91c1c', lineHeight: 1.6 }}>
                {data.red_flags.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </Bloque>
          ) : null}

          {data.yellow_flags?.length ? (
            <Bloque titulo="Yellow flags">
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#b45309', lineHeight: 1.6 }}>
                {data.yellow_flags.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </Bloque>
          ) : null}

          {data.tests_sugeridos?.length ? (
            <Bloque titulo="Tests sugeridos">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{data.tests_sugeridos.map((t, i) => <Chip key={i}>{t}</Chip>)}</div>
            </Bloque>
          ) : null}

          {data.preguntas_sugeridas?.length ? (
            <Bloque titulo="Preguntas sugeridas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.preguntas_sugeridas.map((q, i) => (
                  <button key={i} type="button" onClick={() => onPregunta?.(q.campo)} className="copi-pregunta">
                    {q.pregunta}
                    {q.campo && <span className="copi-campo">{q.campo}</span>}
                  </button>
                ))}
              </div>
            </Bloque>
          ) : null}

          {data.derivacion && (
            <Bloque titulo="Derivación">
              <p style={{ fontSize: 12.5, color: '#b45309', lineHeight: 1.5 }}>{data.derivacion_motivo || 'Se sugiere valorar derivación médica.'}</p>
            </Bloque>
          )}
        </div>
      )}
    </aside>
  )
}
