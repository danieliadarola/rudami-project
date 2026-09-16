'use client'

// components/paciente/Calendario.tsx
// Calendario mensual propio (boceto "Mis sesiones"). Sin FullCalendar: eso
// pesa 200 KB y está pensado para la agenda del fisio en escritorio. Aquí es
// una rejilla de 7 columnas con dos tipos de punto: cita (verde) y día con
// ejercicio (dorado).
//
// Solicitar cambio/cancelación: hoja inferior con una nota opcional. La RPC
// mi_cita_solicitar comprueba que la cita es mía y futura; aquí solo se pide.

import { useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { CitaPaciente, CuentaPaciente } from '@/app/lib/paciente/tipos'
import { DIAS_CORTOS, DIA_MS, desdeIso, iso } from '@/app/lib/paciente/fechas'
import { BarraMi } from './BarraMi'
import { IcoAtras, IcoCheck, IcoChevron, IcoClinica, IcoRutinas, IcoWhatsapp } from './Iconos'

const fechaDe = (c: CitaPaciente) =>
  new Date(c.fecha_hora).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }) // 'YYYY-MM-DD'
const horaDe = (c: CitaPaciente) =>
  new Date(c.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

export function Calendario({
  hoy,
  citas,
  diasEjercicio,
  esClinica,
  clinica,
}: {
  hoy: string
  citas: CitaPaciente[]
  diasEjercicio: { fecha: string; hechos: number }[]
  esClinica: boolean
  clinica: CuentaPaciente['clinica']
}) {
  const [mes, setMes] = useState(() => hoy.slice(0, 7))       // 'YYYY-MM'
  const [sel, setSel] = useState(hoy)
  const [lista, setLista] = useState(citas)
  const [sheet, setSheet] = useState<{ cita: CitaPaciente; tipo: 'cambio' | 'cancelacion' } | null>(null)
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const porFecha = useMemo(() => {
    const m = new Map<string, CitaPaciente[]>()
    lista.forEach((c) => { const f = fechaDe(c); m.set(f, [...(m.get(f) ?? []), c]) })
    return m
  }, [lista])
  const ejercicio = useMemo(() => new Map(diasEjercicio.map((d) => [d.fecha, d.hechos])), [diasEjercicio])

  // Rejilla del mes: empieza en lunes, 6 filas como mucho.
  const celdas = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    const primero = new Date(y, m - 1, 1, 12)
    const offset = (primero.getDay() + 6) % 7
    const inicio = new Date(primero.getTime() - offset * DIA_MS)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getTime() + i * DIA_MS)
      return { fecha: iso(d), dia: d.getDate(), otro: d.getMonth() !== m - 1 }
    }).filter((c, i, arr) => i < 35 || arr.slice(35).some((x) => !x.otro))
  }, [mes])

  const moverMes = (delta: number) => {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1, 12)
    setMes(iso(d).slice(0, 7))
  }

  const tituloMes = desdeIso(mes + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const tituloDia = sel === hoy
    ? `Hoy, ${desdeIso(sel).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
    : desdeIso(sel).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const delDia = porFecha.get(sel) ?? []
  const proximas = lista.filter((c) => fechaDe(c) > hoy && c.estado !== 'cancelada').slice(0, 3)

  const enviar = async () => {
    if (!sheet) return
    setEnviando(true)
    try {
      const { data, error } = await supabase.rpc('mi_cita_solicitar', {
        p_cita: sheet.cita.id, p_tipo: sheet.tipo, p_nota: nota.trim() || null,
      })
      if (error || !data?.ok) throw new Error()
      setLista((prev) => prev.map((c) => c.id === sheet.cita.id
        ? { ...c, solicitud: { tipo: sheet.tipo, estado: 'pendiente' } } : c))
      setToast('Solicitud enviada a tu clínica')
      setSheet(null); setNota('')
    } catch {
      setToast('No se ha podido enviar. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
      setTimeout(() => setToast(null), 2600)
    }
  }

  const tel = clinica?.telefono?.replace(/\D/g, '')

  return (
    <main className="ap-pagina">
      <header className="ap-cab">
        <h1 className="ap-cab-t grande">{esClinica ? 'Mis sesiones' : 'Calendario'}</h1>
      </header>

      <section className="ap-cal" aria-label="Calendario">
        <div className="ap-cal-cab">
          <button type="button" className="ap-cal-btn" aria-label="Mes anterior" onClick={() => moverMes(-1)}><IcoAtras size={18} /></button>
          <span className="ap-cal-mes">{tituloMes}</span>
          <button type="button" className="ap-cal-btn" aria-label="Mes siguiente" onClick={() => moverMes(1)}><IcoChevron size={18} /></button>
        </div>
        <div className="ap-cal-dias" aria-hidden="true">{DIAS_CORTOS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="ap-cal-grid">
          {celdas.map((c) => {
            const cs = porFecha.get(c.fecha) ?? []
            const activa = cs.some((x) => x.estado !== 'cancelada')
            const ej = ejercicio.has(c.fecha)
            return (
              <button
                key={c.fecha}
                type="button"
                className={`ap-cal-dia${c.otro ? ' otro' : ''}${c.fecha === hoy ? ' hoy' : ''}${c.fecha === sel ? ' sel' : ''}`}
                onClick={() => setSel(c.fecha)}
                aria-label={desdeIso(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                aria-pressed={c.fecha === sel}
              >
                {c.dia}
                {cs.length > 0
                  ? <span className={`p${activa ? '' : ' cancel'}`} />
                  : ej ? <span className="p ej" /> : null}
              </button>
            )
          })}
        </div>
      </section>

      <h2 className="ap-dia-t">{tituloDia}</h2>
      <p className="ap-dia-d">
        {[
          delDia.length ? `${delDia.length} ${delDia.length === 1 ? 'sesión' : 'sesiones'}` : null,
          ejercicio.get(sel) ? `${ejercicio.get(sel)} ${ejercicio.get(sel) === 1 ? 'ejercicio hecho' : 'ejercicios hechos'}` : null,
        ].filter(Boolean).join(' · ') || (esClinica ? 'Sin sesiones este día' : 'Sin ejercicio registrado')}
      </p>

      {delDia.map((c) => <Cita key={c.id} c={c} hoy={hoy} onSolicitar={(tipo) => setSheet({ cita: c, tipo })} />)}

      {ejercicio.get(sel) ? (
        <div className="ap-cita ejercicio" style={{ marginTop: delDia.length ? 10 : 0 }}>
          <span className="ap-cita-ico"><IcoRutinas size={18} /></span>
          <div className="ap-cita-txt">
            <div className="ap-cita-t">Ejercicios en casa</div>
            <div className="ap-cita-d">{ejercicio.get(sel)} completados</div>
          </div>
          <span className="mi-ok" style={{ marginTop: 4 }}><IcoCheck size={10} /></span>
        </div>
      ) : null}

      {esClinica && proximas.length > 0 && sel === hoy && (
        <>
          <h2 className="ap-dia-t" style={{ fontSize: 14, marginTop: 26 }}>Próximas sesiones</h2>
          <p className="ap-dia-d">Toca una para pedir un cambio o cancelarla.</p>
          {proximas.filter((c) => fechaDe(c) !== sel).map((c) => (
            <button key={c.id} type="button" className="ap-fila" style={{ marginBottom: 10 }} onClick={() => { setSel(fechaDe(c)); setMes(fechaDe(c).slice(0, 7)) }}>
              <span className="ap-cita-ico" style={{ background: c.color ?? 'var(--verde-bg)', color: c.color ? '#fff' : 'var(--verde-d)' }}><IcoClinica size={18} /></span>
              <span className="ap-fila-txt">
                <span className="ap-fila-t" style={{ display: 'block' }}>
                  {new Date(c.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })}
                </span>
                <span className="ap-fila-d" style={{ display: 'block' }}>{horaDe(c)} · {c.tipo ?? 'Sesión'}{c.fisio ? ` · ${c.fisio}` : ''}</span>
              </span>
              <IcoChevron className="chev" />
            </button>
          ))}
        </>
      )}

      {esClinica && tel && (
        <a className="mi-secundario" style={{ marginTop: 26 }} href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer">
          <IcoWhatsapp /> Escribir a {clinica?.nombre ?? 'mi clínica'}
        </a>
      )}

      {sheet && (
        <>
          <div className="guia-sheet-bg" onClick={() => setSheet(null)} />
          <div className="guia-sheet" role="dialog" aria-label={sheet.tipo === 'cambio' ? 'Solicitar cambio de cita' : 'Solicitar cancelación'}>
            <div className="guia-sheet-head">
              <strong>{sheet.tipo === 'cambio' ? 'Pedir otro día u hora' : 'Cancelar esta sesión'}</strong>
              <button type="button" className="btn-ghost" onClick={() => setSheet(null)}>Cerrar</button>
            </div>
            <div style={{ padding: '14px 20px 4px' }}>
              <p className="mi-nota" style={{ marginTop: 0 }}>
                {new Date(sheet.cita.fecha_hora).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })}
                {sheet.cita.tipo ? ` · ${sheet.cita.tipo}` : ''}
              </p>
              <p className="mi-nota mi-nota-suave">
                Tu clínica recibe la solicitud y te confirma. La cita sigue en pie hasta que te respondan.
              </p>
              <label htmlFor="nota-cita" className="mi-entrar-label" style={{ display: 'block', marginTop: 14 }}>
                {sheet.tipo === 'cambio' ? '¿Qué días te vendrían bien?' : 'Motivo (opcional)'}
              </label>
              <textarea
                id="nota-cita" className="mi-input" rows={3} maxLength={300}
                value={nota} onChange={(e) => setNota(e.target.value)}
                placeholder={sheet.tipo === 'cambio' ? 'Por ejemplo: cualquier tarde de la semana que viene' : ''}
              />
            </div>
            <div className="guia-sheet-input" style={{ borderTop: 0 }}>
              <button type="button" className="ap-btn" disabled={enviando} onClick={enviar} style={{ width: '100%' }}>
                {enviando ? 'Enviando…' : sheet.tipo === 'cambio' ? 'Enviar solicitud' : 'Solicitar cancelación'}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="ap-toast" role="status">{toast}</div>}

      <BarraMi activa="sesiones" />
    </main>
  )
}

function Cita({ c, hoy, onSolicitar }: { c: CitaPaciente; hoy: string; onSolicitar: (t: 'cambio' | 'cancelacion') => void }) {
  // "Hoy" lo da el servidor (Europe/Madrid); la RPC vuelve a comprobar que la
  // cita sea futura, así que aquí basta con el día.
  const futura = fechaDe(c) >= hoy
  const cancelada = c.estado === 'cancelada'
  const pendiente = c.solicitud?.estado === 'pendiente'
  return (
    <div className={`ap-cita${cancelada ? ' cancelada' : ''}`}>
      <span className="ap-cita-ico" style={c.color && !cancelada ? { background: c.color, color: '#fff' } : undefined}><IcoClinica size={18} /></span>
      <div className="ap-cita-txt">
        <div className="ap-cita-hora">{horaDe(c)}{c.duracion_min ? ` · ${c.duracion_min} min` : ''}</div>
        <div className="ap-cita-t">{c.tipo ?? 'Sesión'}</div>
        <div className="ap-cita-d">
          {c.fisio ? `Con ${c.fisio}` : ''}
          {cancelada ? ' · Cancelada' : c.estado === 'confirmada' ? ' · Confirmada' : ''}
        </div>
        {pendiente ? (
          <span className="ap-etiqueta neutra" style={{ marginTop: 8 }}>
            {c.solicitud?.tipo === 'cambio' ? 'Cambio solicitado' : 'Cancelación solicitada'} · pendiente
          </span>
        ) : c.solicitud?.estado === 'rechazada' ? (
          <span className="ap-etiqueta neutra" style={{ marginTop: 8 }}>La clínica no pudo atender tu solicitud</span>
        ) : futura && !cancelada ? (
          <div className="ap-cita-acciones">
            <button type="button" className="ap-btn-linea pequeno" onClick={() => onSolicitar('cambio')}>Cambiar</button>
            <button type="button" className="ap-btn-linea pequeno" onClick={() => onSolicitar('cancelacion')}>Cancelar</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
