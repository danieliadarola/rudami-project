'use client'
// Informe clínico/profesional: vista técnica para el fisio y la clínica (no la ve el paciente).
// Reutiliza los datos de la sesión vinculada + el informe. Exporta a PDF con window.print().

import { useState, use, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { PrintBtn } from '@/components/informes/PrintBtn'

function extraerSeccion(texto: string, seccion: string): string {
  if (!texto || !texto.includes(seccion)) return ''
  const partes = texto.split(seccion)
  if (partes.length < 2) return ''
  const resto = partes[1]
  const siguiente = resto.match(/\n\*\*[A-ZÁÉÍÓÚÑ][^*]+\*\*/)
  return siguiente && siguiente.index !== undefined ? resto.slice(0, siguiente.index).trim() : resto.trim()
}

const evaColor = (v: number) => v <= 3 ? '#16a34a' : v <= 6 ? '#d97706' : '#dc2626'

function Seccion({ label, children, alerta }: { label: string; children: React.ReactNode; alerta?: boolean }) {
  return <div className="rep-card" style={alerta ? { borderColor: '#fca5a5', boxShadow: '0 0 0 3px rgba(220,38,38,.06)' } : undefined}><div className="rep-label">{label}</div>{children}</div>
}

export default function InformeClinico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [inf, setInf] = useState<any>(null)
  const [pac, setPac] = useState<any>(null)
  const [ses, setSes] = useState<any>(null)
  const [fisio, setFisio] = useState<any>(null)
  const [clinica, setClinica] = useState<any>(null)
  const [ejs, setEjs] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const { data: i } = await supabase.from('informes').select('*').eq('id', id).single()
    if (!i) { router.push('/informes'); return }
    setInf(i)
    const [{ data: p }, { data: s }, { data: e }] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', i.paciente_id).single(),
      i.sesion_id ? supabase.from('sesiones').select('*').eq('id', i.sesion_id).single() : Promise.resolve({ data: null }),
      supabase.from('informe_ejercicios').select('*').eq('informe_id', id).order('orden'),
    ])
    setPac(p); setSes(s); setEjs(e ?? [])
    if (i.fisio_id) { const { data: f } = await supabase.from('perfiles').select('nombre, apellidos, numero_colegiado').eq('id', i.fisio_id).single(); setFisio(f) }
    if (i.clinica_id) { const { data: c } = await supabase.from('clinicas').select('nombre').eq('id', i.clinica_id).single(); setClinica(c) }
    setCargando(false)
  }, [id, router])
  useEffect(() => { cargar() }, [cargar])

  if (cargando || !inf) return <AppShell><div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div></AppShell>

  const diag = ses?.diagnostico_ia || ''
  const clasificacion = extraerSeccion(diag, '**CLASIFICACIÓN CLÍNICA**')
  const tejidos = extraerSeccion(diag, '**TEJIDOS Y ESTRUCTURAS IMPLICADAS**')
  const hipotesis = extraerSeccion(diag, '**HIPÓTESIS DIAGNÓSTICA PRINCIPAL**') || ses?.hipotesis_principal
  const diferencial = extraerSeccion(diag, '**DIAGNÓSTICO DIFERENCIAL**')
  const redFlagsTexto = extraerSeccion(diag, '**RED FLAGS**') || ses?.red_flags
  const yellowFlags = extraerSeccion(diag, '**YELLOW FLAGS**')
  const derivacionTexto = extraerSeccion(diag, '**DERIVACIÓN MÉDICA**')
  const pruebas = extraerSeccion(diag, '**EXPLORACIÓN COMPLEMENTARIA RECOMENDADA**')
  const plan = extraerSeccion(diag, '**PLAN DE TRATAMIENTO PROPUESTO**')
  const educacion = extraerSeccion(diag, '**EDUCACIÓN AL PACIENTE**')
  const pronostico = extraerSeccion(diag, '**PRONÓSTICO**')

  const noSig = /no se identifican|no hay|ninguna|sin red flags|no se indica|no procede|no indicada|^no\b/i
  const hayRedFlags = !!redFlagsTexto && !noSig.test(redFlagsTexto.trim())
  const hayDerivacion = ses?.derivacion === true || (!!derivacionTexto && !noSig.test(derivacionTexto.trim()))

  const met = inf.metricas ?? {}
  const fecha = new Date((inf.fecha || '') + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const edad = pac?.fecha_nacimiento ? Math.floor((Date.now() - new Date(pac.fecha_nacimiento).getTime()) / 31557600000) : null
  const otras: [string, number][] = ([['Movilidad', met.movilidad], ['Fuerza', met.fuerza], ['Rigidez', met.rigidez], ['Fatiga', met.fatiga], ['Sueño', met.sueno], ['Adherencia', met.adherencia]] as any).filter(([, v]: any) => v != null)

  return (
    <AppShell>
      <div className="rep-bg" style={{ margin: '-8px -24px', padding: '8px 24px' }}>
        <div className="rep-page">
          <button onClick={() => router.push(`/informes/${id}`)} className="back-link rep-print">← Volver al editor</button>

          <div className="rep-top">
            <span className="rep-wordmark">RUDAMI · INFORME CLÍNICO</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{clinica?.nombre ?? ''}</span>
          </div>

          <div style={{ padding: '14px 0 8px', borderBottom: '1px solid var(--hair)', marginBottom: 18 }}>
            <p className="rep-label" style={{ marginBottom: 8 }}>Documento de uso interno · no compartir con el paciente</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>{pac?.nombre} {pac?.apellidos}</h1>
            <div className="rep-meta">
              <span>{fecha}</span>
              {inf.tipo_sesion && <span>· {inf.tipo_sesion}</span>}
              {inf.numero_sesion && <span>· Sesión {inf.numero_sesion}{inf.total_sesiones ? ` de ${inf.total_sesiones}` : ''}</span>}
              {edad != null && <span>· {edad} años</span>}
              {pac?.genero && <span>· {pac.genero}</span>}
            </div>
            {fisio && (
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>
                Responsable: <strong style={{ color: 'var(--ink)' }}>{fisio.nombre} {fisio.apellidos}</strong>
                {fisio.numero_colegiado && ` · Nº colegiado ${fisio.numero_colegiado}`}
              </p>
            )}
          </div>

          {(hayRedFlags || hayDerivacion) && (
            <Seccion label="⚠ Requiere valoración / derivación" alerta>
              {hayRedFlags && <p style={{ fontSize: 14, color: '#7f1d1d', marginBottom: hayDerivacion ? 8 : 0 }}><strong>Red flags:</strong> {redFlagsTexto}</p>}
              {hayDerivacion && <p style={{ fontSize: 14, color: '#7f1d1d' }}><strong>Derivación:</strong> {derivacionTexto || 'Indicada'}</p>}
            </Seccion>
          )}

          <Seccion label="Datos del paciente">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 20px', fontSize: 13.5, color: 'var(--ink-2)' }}>
              <div><span style={{ color: 'var(--faint)' }}>Teléfono</span><br />{pac?.telefono || '—'}</div>
              <div><span style={{ color: 'var(--faint)' }}>Email</span><br />{pac?.email || '—'}</div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--faint)' }}>Motivo de consulta</span><br />{pac?.motivo_consulta || '—'}</div>
              {pac?.antecedentes && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--faint)' }}>Antecedentes</span><br />{pac.antecedentes}</div>}
            </div>
          </Seccion>

          {ses && (
            <Seccion label="Exploración y anamnesis de la sesión">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {ses.anamnesis && <div><strong style={{ color: 'var(--ink)' }}>Anamnesis: </strong>{ses.anamnesis}</div>}
                {ses.exploracion_fisica && <div><strong style={{ color: 'var(--ink)' }}>Exploración física: </strong>{ses.exploracion_fisica}</div>}
                {ses.tests_ortopedicos && <div><strong style={{ color: 'var(--ink)' }}>Tests ortopédicos: </strong>{ses.tests_ortopedicos}</div>}
                {ses.factores_agravantes && <div><strong style={{ color: 'var(--ink)' }}>Agravantes: </strong>{ses.factores_agravantes}</div>}
                {ses.factores_calmantes && <div><strong style={{ color: 'var(--ink)' }}>Calmantes: </strong>{ses.factores_calmantes}</div>}
                {ses.irradiacion && <div><strong style={{ color: 'var(--ink)' }}>Irradiación: </strong>{ses.irradiacion}</div>}
                {ses.contexto_biopsicosocial && <div><strong style={{ color: 'var(--ink)' }}>Biopsicosocial: </strong>{ses.contexto_biopsicosocial}</div>}
              </div>
            </Seccion>
          )}

          {(hipotesis || clasificacion || tejidos || diferencial) && (
            <Seccion label="Razonamiento clínico">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {clasificacion && <div><strong style={{ color: 'var(--ink)' }}>Clasificación clínica: </strong>{clasificacion}</div>}
                {hipotesis && <div><strong style={{ color: 'var(--ink)' }}>Hipótesis diagnóstica: </strong>{hipotesis}</div>}
                {tejidos && <div><strong style={{ color: 'var(--ink)' }}>Tejidos y estructuras: </strong>{tejidos}</div>}
                {diferencial && <div><strong style={{ color: 'var(--ink)' }}>Diagnóstico diferencial: </strong>{diferencial}</div>}
                {yellowFlags && <div><strong style={{ color: 'var(--ink)' }}>Yellow flags: </strong>{yellowFlags}</div>}
                {pruebas && <div><strong style={{ color: 'var(--ink)' }}>Exploración complementaria: </strong>{pruebas}</div>}
              </div>
            </Seccion>
          )}

          {(plan || educacion || pronostico) && (
            <Seccion label="Plan de tratamiento">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {plan && <div style={{ whiteSpace: 'pre-line' }}>{plan}</div>}
                {educacion && <div><strong style={{ color: 'var(--ink)' }}>Educación al paciente: </strong>{educacion}</div>}
                {pronostico && <div><strong style={{ color: 'var(--ink)' }}>Pronóstico: </strong>{pronostico}</div>}
              </div>
            </Seccion>
          )}

          {(met.dolor_ini != null || otras.length > 0) && (
            <Seccion label="Indicadores de seguimiento">
              {(met.dolor_ini != null || met.dolor_fin != null) && (
                <div style={{ display: 'flex', gap: 22, marginBottom: otras.length ? 18 : 0 }}>
                  {[['EVA inicial', met.dolor_ini], ['EVA final', met.dolor_fin]].map(([l, v]: any) => (
                    <div key={l} style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{l}</div>
                      <div className="rep-bar"><span style={{ width: `${(v ?? 0) * 10}%`, background: evaColor(v ?? 0) }} /></div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>{v ?? '—'}<span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 500 }}>/10</span></div>
                    </div>
                  ))}
                </div>
              )}
              {otras.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {otras.map(([l, v]) => (
                    <div key={l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--ink-2)' }}>{l}</span><strong style={{ color: 'var(--ink)' }}>{v}/10</strong></div>
                      <div className="rep-bar"><span style={{ width: `${v * 10}%`, background: 'var(--ink)' }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </Seccion>
          )}

          {ejs.length > 0 && (
            <Seccion label="Ejercicios prescritos">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ejs.map((e: any, idx: number) => (
                  <div key={idx} style={{ borderBottom: idx < ejs.length - 1 ? '1px solid var(--hair-s)' : 'none', paddingBottom: idx < ejs.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                      <strong style={{ color: 'var(--ink)' }}>{e.nombre}</strong>
                      <span style={{ color: 'var(--muted)' }}>{[e.series && `${e.series} series`, e.repeticiones && `${e.repeticiones} reps`, e.descanso && `descanso ${e.descanso}`].filter(Boolean).join(' · ')}</span>
                    </div>
                    {e.musculos && <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>{e.musculos}</p>}
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {inf.notas_fisio && (
            <Seccion label="Notas internas">
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{inf.notas_fisio}</p>
            </Seccion>
          )}

          <div className="rep-card" style={{ background: 'var(--paper-2)' }}>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              ⚕ Informe de soporte a la decisión clínica generado con asistencia de IA. No constituye diagnóstico médico ni sustituye el juicio del fisioterapeuta colegiado responsable.
              {fisio && (fisio.nombre || fisio.numero_colegiado) && <> Responsable: {fisio.nombre} {fisio.apellidos}{fisio.numero_colegiado ? ` · Nº colegiado ${fisio.numero_colegiado}` : ''}.</>}
            </p>
          </div>

          <div className="rep-print"><PrintBtn /></div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 22 }}>Generado con RuDaMi · {clinica?.nombre ?? ''} · {new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>
    </AppShell>
  )
}
