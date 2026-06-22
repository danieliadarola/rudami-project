import { createClient } from '@/app/lib/supabase-server'
import { PrintBtn } from '@/components/informes/PrintBtn'

export const revalidate = 0

const ini = (n?: string, a?: string) => `${(n ?? '')[0] ?? ''}${(a ?? '')[0] ?? ''}`.toUpperCase()
const evaColor = (v: number) => v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626'
const FASE_COL = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']

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
  const di = met.dolor_ini ?? 0, df = met.dolor_fin ?? 0
  const mejora = di - df
  const otras: [string, number][] = [['Movilidad', met.movilidad], ['Fuerza', met.fuerza], ['Rigidez', met.rigidez], ['Fatiga', met.fatiga], ['Sueño', met.sueno], ['Adherencia', met.adherencia]].filter(([, v]) => v != null) as any

  return (
    <div style={{ background: '#f6f7f9', minHeight: '100vh', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
      <div className="rep-page">
        {/* Hero */}
        <div className="rep-hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, letterSpacing: '.16em', fontSize: 13 }}>RUDAMI</span>
            <span style={{ fontSize: 12, opacity: .85 }}>{cli?.nombre ?? ''}</span>
          </div>
          <h1 className="rep-hero-h">Hola, {pac?.nombre}</h1>
          <p style={{ opacity: .9, fontSize: 14, marginTop: 4 }}>Este es el resumen de tu sesión.</p>
          <div className="rep-hero-meta">
            <span>{fecha}</span>
            {i.tipo_sesion && <span>· {i.tipo_sesion}</span>}
            {i.duracion_min && <span>· {i.duracion_min} min</span>}
            {i.numero_sesion && <span>· Sesión {i.numero_sesion}{i.total_sesiones ? ` de ${i.total_sesiones}` : ''}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{ini(fis?.nombre, fis?.apellidos)}</span>
            <span style={{ fontSize: 13 }}>{fis?.nombre} {fis?.apellidos} · tu fisioterapeuta</span>
          </div>
        </div>

        {/* Resumen */}
        {i.resumen && (
          <div className="rep-card" style={{ background: 'linear-gradient(135deg,#eef2ff,#fff)' }}>
            <div className="rep-h">Lo importante de hoy</div>
            <p style={{ fontSize: 16, lineHeight: 1.5, color: '#16181f', fontWeight: 500 }}>{i.resumen}</p>
          </div>
        )}

        {/* Dolor */}
        <div className="rep-card">
          <div className="rep-h">Tu dolor en esta sesión</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[['Al empezar', di], ['Al terminar', df]].map(([l, v]: any) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#707888', marginBottom: 6 }}>{l}</div>
                <div style={{ height: 10, borderRadius: 999, background: '#eef0f3', overflow: 'hidden' }}>
                  <div style={{ width: `${v * 10}%`, height: '100%', background: evaColor(v), borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: evaColor(v), marginTop: 6 }}>{v}<span style={{ fontSize: 12, color: '#9aa1af' }}>/10</span></div>
              </div>
            ))}
          </div>
          {mejora > 0 && <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#10b981' }}>↘ Has mejorado {mejora} {mejora === 1 ? 'punto' : 'puntos'} respecto al inicio.</p>}
        </div>

        {/* Explicación */}
        {i.explicacion && (
          <div className="rep-card">
            <div className="rep-h">Qué te ocurre</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3f4654' }}>{i.explicacion}</p>
          </div>
        )}

        {/* Qué esperar */}
        {Array.isArray(i.que_esperar) && i.que_esperar.length > 0 && (
          <div className="rep-card">
            <div className="rep-h">¿Qué podemos esperar?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {i.que_esperar.map((f: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 13 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: FASE_COL[idx % 4], color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{f.fase ?? idx + 1}</span>
                    {idx < i.que_esperar.length - 1 && <span style={{ width: 2, flex: 1, background: '#eef0f3', marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: '#16181f' }}>{f.titulo}</p>
                    <p style={{ fontSize: 13.5, color: '#707888', marginTop: 2, lineHeight: 1.5 }}>{f.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ejercicios */}
        {ejs.length > 0 && (
          <div style={{ margin: '4px 0' }}>
            <div className="rep-h" style={{ padding: '0 6px 4px' }}>Tus ejercicios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ejs.map((e: any, idx: number) => (
                <div key={idx} className="rep-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: 150, background: e.gif_url || e.imagen_url ? `center/cover no-repeat url(${e.gif_url || e.imagen_url})` : 'linear-gradient(135deg,#dbeafe,#ede9fe)', display: 'grid', placeItems: 'center' }}>
                    {!(e.gif_url || e.imagen_url) && <span style={{ fontSize: 38 }}>🏋️</span>}
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#16181f' }}>{e.nombre}</h3>
                      {e.nivel && <span style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', background: '#eff6ff', padding: '3px 10px', borderRadius: 999 }}>{e.nivel}</span>}
                    </div>
                    {e.musculos && <p style={{ fontSize: 12.5, color: '#9aa1af', marginTop: 2 }}>{e.musculos}</p>}
                    <div style={{ display: 'flex', gap: 18, margin: '12px 0', flexWrap: 'wrap' }}>
                      {e.series && <Dato l="Series" v={e.series} />}
                      {e.repeticiones && <Dato l="Reps" v={e.repeticiones} />}
                      {e.descanso && <Dato l="Descanso" v={e.descanso} />}
                    </div>
                    {e.instrucciones && <p style={{ fontSize: 14, color: '#3f4654', lineHeight: 1.55 }}>{e.instrucciones}</p>}
                    {e.errores && <p style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 10 }}>❌ {e.errores}</p>}
                    {e.consejos && <p style={{ fontSize: 12.5, color: '#15803d', marginTop: 4 }}>✔ {e.consejos}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métricas */}
        {otras.length > 0 && (
          <div className="rep-card">
            <div className="rep-h">Tu seguimiento</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 16 }}>
              {otras.map(([l, v]) => (
                <div key={l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: '#707888' }}>{l}</span><strong>{v}/10</strong></div>
                  <div style={{ height: 8, borderRadius: 999, background: '#eef0f3', overflow: 'hidden' }}><div style={{ width: `${v * 10}%`, height: '100%', background: '#3b82f6', borderRadius: 999 }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {Array.isArray(i.recomendaciones) && i.recomendaciones.length > 0 && (
          <div className="rep-card">
            <div className="rep-h">Recomendaciones para casa</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {i.recomendaciones.map((r: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{r.icono}</span>
                  <span style={{ fontSize: 14, color: '#3f4654' }}>{r.texto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivación */}
        {i.motivacion && (
          <div className="rep-card" style={{ background: 'linear-gradient(135deg,#16181f,#2c3140)', color: '#fff', textAlign: 'center', border: 'none' }}>
            <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.5, fontFamily: 'var(--font-newsreader), Georgia, serif', fontStyle: 'italic' }}>“{i.motivacion}”</p>
          </div>
        )}

        <PrintBtn />
        <p style={{ textAlign: 'center', fontSize: 11, color: '#9aa1af', marginTop: 20 }}>Generado con RuDaMi · {cli?.nombre ?? ''}</p>
      </div>
    </div>
  )
}

function Dato({ l, v }: { l: string; v: any }) {
  return <div><div style={{ fontSize: 10.5, color: '#9aa1af', textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#16181f' }}>{v}</div></div>
}
