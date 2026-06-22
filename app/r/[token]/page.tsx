import { createClient } from '@/app/lib/supabase-server'
import { PrintBtn } from '@/components/informes/PrintBtn'

export const revalidate = 0

const ini = (n?: string, a?: string) => `${(n ?? '')[0] ?? ''}${(a ?? '')[0] ?? ''}`.toUpperCase()
const evaColor = (v: number) => v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626'

function Seccion({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rep-card"><div className="rep-label">{label}</div>{children}</div>
}
const IconMov = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#aeb4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h3l2-6 4 12 2-6h4" />
  </svg>
)

export default async function ReportePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('informe_publico', { p_token: token })

  if (!data || !data.informe) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff', textAlign: 'center', padding: 24 }}>
        <div>
          <p style={{ fontWeight: 700, letterSpacing: '.14em', color: '#16181f' }}>RUDAMI</p>
          <p style={{ color: '#707888', marginTop: 12 }}>Este informe no está disponible o aún no ha sido publicado.</p>
        </div>
      </div>
    )
  }

  const i = data.informe, pac = data.paciente, fis = data.fisio, cli = data.clinica
  const ejs = data.ejercicios ?? []
  const met = i.metricas ?? {}
  const fecha = new Date((i.fecha || '') + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const di = met.dolor_ini ?? 0, df = met.dolor_fin ?? 0, mejora = di - df
  const otras: [string, number][] = ([['Movilidad', met.movilidad], ['Fuerza', met.fuerza], ['Rigidez', met.rigidez], ['Fatiga', met.fatiga], ['Sueño', met.sueno], ['Adherencia', met.adherencia]] as any).filter(([, v]: any) => v != null)

  return (
    <div className="rep-bg">
      <div className="rep-page">
        {/* Cabecera */}
        <div className="rep-top">
          <span className="rep-wordmark">RUDAMI</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{cli?.nombre ?? ''}</span>
        </div>

        <div style={{ padding: '18px 0 8px', borderBottom: '1px solid var(--hair)', marginBottom: 18 }}>
          <p className="rep-label" style={{ color: 'var(--accent)', marginBottom: 8 }}>Informe de tu sesión</p>
          <h1 className="rep-title">Hola, {pac?.nombre}</h1>
          <div className="rep-meta">
            <span>{fecha}</span>
            {i.tipo_sesion && <span>· {i.tipo_sesion}</span>}
            {i.duracion_min && <span>· {i.duracion_min} min</span>}
            {i.numero_sesion && <span>· Sesión {i.numero_sesion}{i.total_sesiones ? ` de ${i.total_sesiones}` : ''}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--paper-2)', border: '1px solid var(--hair)', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-2)' }}>{ini(fis?.nombre, fis?.apellidos)}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fis?.nombre} {fis?.apellidos} · tu fisioterapeuta</span>
          </div>
        </div>

        {i.resumen && (
          <Seccion label="Lo importante de hoy">
            <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink)', fontWeight: 500 }}>{i.resumen}</p>
          </Seccion>
        )}

        {/* Dolor */}
        <Seccion label="Tu dolor en esta sesión">
          <div style={{ display: 'flex', gap: 22 }}>
            {[['Al empezar', di], ['Al terminar', df]].map(([l, v]: any) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{l}</div>
                <div className="rep-bar"><span style={{ width: `${v * 10}%`, background: evaColor(v) }} /></div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>{v}<span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/10</span></div>
              </div>
            ))}
          </div>
          {mejora > 0 && <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#10b981' }}>↓ Has mejorado {mejora} {mejora === 1 ? 'punto' : 'puntos'} respecto al inicio.</p>}
        </Seccion>

        {i.explicacion && (
          <Seccion label="Qué te ocurre">
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)' }}>{i.explicacion}</p>
          </Seccion>
        )}

        {/* Qué esperar */}
        {Array.isArray(i.que_esperar) && i.que_esperar.length > 0 && (
          <Seccion label="¿Qué podemos esperar?">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {i.que_esperar.map((f: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--ink)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{f.fase ?? idx + 1}</span>
                    {idx < i.que_esperar.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--hair)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: idx < i.que_esperar.length - 1 ? 16 : 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{f.titulo}</p>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{f.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Ejercicios */}
        {ejs.length > 0 && (
          <div style={{ margin: '2px 0 14px' }}>
            <div className="rep-label" style={{ padding: '0 2px' }}>Tus ejercicios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ejs.map((e: any, idx: number) => (
                <div key={idx} className="rep-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="rep-ex-media" style={e.gif_url || e.imagen_url ? { background: `center/cover no-repeat url(${e.gif_url || e.imagen_url})` } : undefined}>
                    {!(e.gif_url || e.imagen_url) && <IconMov />}
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{e.nombre}</h3>
                      {e.nivel && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--hair)', padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize' }}>{e.nivel}</span>}
                    </div>
                    {e.musculos && <p style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 2 }}>{e.musculos}</p>}
                    <div style={{ display: 'flex', gap: 26, margin: '14px 0', flexWrap: 'wrap' }}>
                      {e.series && <div><div className="rep-stat-l">Series</div><div className="rep-stat-v">{e.series}</div></div>}
                      {e.repeticiones && <div><div className="rep-stat-l">Reps</div><div className="rep-stat-v">{e.repeticiones}</div></div>}
                      {e.descanso && <div><div className="rep-stat-l">Descanso</div><div className="rep-stat-v">{e.descanso}</div></div>}
                    </div>
                    {e.instrucciones && <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{e.instrucciones}</p>}
                    {e.errores && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12, display: 'flex', gap: 8 }}><span style={{ color: '#dc2626', fontWeight: 700 }}>Evita</span> {e.errores}</p>}
                    {e.consejos && <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8 }}><span style={{ color: '#16a34a', fontWeight: 700 }}>Consejo</span> {e.consejos}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seguimiento */}
        {otras.length > 0 && (
          <Seccion label="Tu seguimiento">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {otras.map(([l, v]) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}><span style={{ color: 'var(--ink-2)' }}>{l}</span><strong style={{ color: 'var(--ink)' }}>{v}/10</strong></div>
                  <div className="rep-bar"><span style={{ width: `${v * 10}%`, background: 'var(--ink)' }} /></div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Recomendaciones */}
        {Array.isArray(i.recomendaciones) && i.recomendaciones.length > 0 && (
          <Seccion label="Recomendaciones para casa">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {i.recomendaciones.map((r: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, transform: 'translateY(-2px)' }} />
                  <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{r.texto}</span>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {/* Motivación */}
        {i.motivacion && (
          <div className="rep-card" style={{ background: 'var(--ink)', color: '#fff', textAlign: 'center', border: 'none', padding: '30px 26px' }}>
            <p style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.5, fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: 'italic' }}>“{i.motivacion}”</p>
          </div>
        )}

        <PrintBtn />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 22 }}>Generado con RuDaMi · {cli?.nombre ?? ''}</p>
      </div>
    </div>
  )
}
