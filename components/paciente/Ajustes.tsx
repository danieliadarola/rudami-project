'use client'

// components/paciente/Ajustes.tsx
// Datos personales, tema y ayuda. El tema se guarda igual que en la app de
// la clínica (localStorage 'rudami-tema' + data-theme en <html>), así que el
// script del layout raíz lo aplica antes de pintar.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CuentaPaciente } from '@/app/lib/paciente/tipos'
import { BarraMi } from './BarraMi'
import { Cabecera } from './Cabecera'
import { IcoAyuda, IcoCheck, IcoChevron, IcoLuna, IcoSalir, IcoWhatsapp } from './Iconos'

export function Ajustes({ cuenta }: { cuenta: CuentaPaciente }) {
  const router = useRouter()
  const gestionaClinica = cuenta.tipo === 'clinica'
  const [nombre, setNombre] = useState(cuenta.nombre ?? '')
  const [guardado, setGuardado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [oscuro, setOscuro] = useState(false)

  // Leer el tema guardado al montar, desde un ref callback y no desde un
  // efecto: en el servidor no hay localStorage, y con reactCompiler un
  // setState dentro de useEffect es error de lint (misma técnica que Revelar).
  const raiz = useCallback((el: HTMLElement | null) => {
    if (!el) return
    try { setOscuro(localStorage.getItem('rudami-tema') === 'dark') } catch { /* sin storage */ }
  }, [])

  const cambiarTema = (on: boolean) => {
    setOscuro(on)
    try {
      if (on) localStorage.setItem('rudami-tema', 'dark'); else localStorage.removeItem('rudami-tema')
    } catch { /* sin storage: solo esta sesión */ }
    if (on) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
  }

  const guardarNombre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || ocupado) return
    setOcupado(true)
    const { data } = await supabase.rpc('mi_cuenta_nombre', { p_nombre: nombre.trim() })
    setOcupado(false)
    if (data?.ok) { setGuardado(true); router.refresh(); setTimeout(() => setGuardado(false), 2000) }
  }

  const tel = cuenta.clinica?.telefono?.replace(/\D/g, '')

  return (
    <main className="ap-pagina" ref={raiz}>
      <Cabecera titulo="Mis datos" atras="/mi/perfil" grande />

      <form onSubmit={guardarNombre} className="ap-card">
        <div className="ap-form-campo" style={{ marginTop: 0 }}>
          <label htmlFor="aj-nombre" className="mi-entrar-label">Nombre</label>
          <input
            id="aj-nombre" className="mi-input" type="text" maxLength={80}
            value={gestionaClinica ? [cuenta.nombre, cuenta.apellidos].filter(Boolean).join(' ') : nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={gestionaClinica || ocupado}
          />
          {gestionaClinica && <p className="ap-barra-txt">Lo gestiona tu clínica. Si hay un error, díselo en tu próxima sesión.</p>}
        </div>
        <div className="ap-form-campo">
          <label htmlFor="aj-email" className="mi-entrar-label">Correo</label>
          <input id="aj-email" className="mi-input" type="email" value={cuenta.email ?? ''} disabled />
          <p className="ap-barra-txt">Es tu forma de entrar: te enviamos el enlace ahí.</p>
        </div>
        {!gestionaClinica && (
          <button type="submit" className="mi-btn" disabled={ocupado || !nombre.trim() || nombre.trim() === (cuenta.nombre ?? '')}>
            {guardado ? <><IcoCheck size={12} /> Guardado</> : ocupado ? 'Guardando…' : 'Guardar'}
          </button>
        )}
      </form>

      <section className="ap-seccion">
        <h2 className="ap-seccion-t" style={{ marginBottom: 12 }}>Preferencias</h2>
        <div className="ap-menu">
          <button type="button" className="ap-menu-item" role="switch" aria-checked={oscuro} onClick={() => cambiarTema(!oscuro)}>
            <IcoLuna size={20} />
            <span>Modo oscuro<span className="sub">{oscuro ? 'Activado' : 'Desactivado'}</span></span>
            <span className={`ap-check${oscuro ? ' on' : ''}`} style={{ marginLeft: 'auto' }} aria-hidden="true"><IcoCheck size={12} /></span>
          </button>
        </div>
      </section>

      <section className="ap-seccion">
        <h2 className="ap-seccion-t" style={{ marginBottom: 12 }}>Ayuda</h2>
        <div className="ap-menu">
          {tel && (
            <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="ap-menu-item">
              <IcoWhatsapp size={20} /> Escribir a {cuenta.clinica?.nombre} <IcoChevron className="chev" />
            </a>
          )}
          <a href="mailto:hola@rudami.app?subject=Ayuda%20con%20la%20app" className="ap-menu-item">
            <IcoAyuda size={20} /> Soporte de RuDaMi <IcoChevron className="chev" />
          </a>
          <a href="/api/logout?next=%2Fmi%2Fentrar" className="ap-menu-item peligro"><IcoSalir size={20} /> Cerrar sesión</a>
        </div>
        <p className="ap-bienvenida-pie" style={{ marginTop: 16 }}>
          Para borrar tu cuenta y tus datos, escríbenos desde este mismo correo. Lo hacemos en 72 horas.
        </p>
      </section>

      <BarraMi activa="perfil" />
    </main>
  )
}
