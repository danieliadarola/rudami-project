'use client'

// components/paciente/Planes.tsx
// Free · Premium · Clinic, adaptado del boceto "Tu plan".
//
// SIN PASARELA DE PAGO TODAVÍA: "Hazte Premium" registra el interés
// (mi_premium_interes) y lo dice con todas las letras. Fingir un cobro o
// activar Premium sin pagar sería peor que esperar a Stripe.

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import type { CuentaPaciente } from '@/app/lib/paciente/tipos'
import { fechaLarga } from '@/app/lib/paciente/fechas'
import { BarraMi } from './BarraMi'
import { Cabecera } from './Cabecera'
import { IcoCheck, IcoClinica, IcoEstrella } from './Iconos'

const FREE = ['Biblioteca de ejercicios con fotos e ilustraciones', 'Rutinas básicas guiadas paso a paso', 'Calendario y días de ejercicio', 'Seguimiento básico y perfil', 'Historial de lo que has hecho']
const PREMIUM = ['Asistente IA para tus dudas, con guardarraíles', 'Biblioteca completa: programas avanzados', 'Estadísticas y seguimiento avanzado', 'Objetivos semanales personalizados']
const PRONTO = ['Rutinas adaptativas y progresiones', 'Más contenido cada mes']
const CLINICA = ['Plan de ejercicios de tu fisioterapeuta', 'Chat con IA sobre tu plan', 'Tus sesiones, con cambios y cancelaciones', 'Seguimiento de tu progreso, sesión a sesión', 'Todo lo de Premium, sin coste para ti']

function Lista({ items, pronto = false }: { items: string[]; pronto?: boolean }) {
  return (
    <ul className="ap-lista-check">
      {items.map((t) => <li key={t} className={pronto ? 'pronto' : ''}><IcoCheck size={18} /> {t}{pronto ? ' · próximamente' : ''}</li>)}
    </ul>
  )
}

export function Planes({ cuenta }: { cuenta: CuentaPaciente }) {
  const estado = cuenta.plan.estado
  const [interes, setInteres] = useState(cuenta.plan.interes)
  const [ocupado, setOcupado] = useState(false)

  const quiero = async () => {
    setOcupado(true)
    const { data } = await supabase.rpc('mi_premium_interes')
    setOcupado(false)
    if (data?.ok) setInteres(true)
  }

  return (
    <main className="ap-pagina">
      <Cabecera titulo="Tu plan" atras="/mi/perfil" grande />

      <div className="ap-planes">
        {/* Clínica: arriba si es el caso, abajo como invitación si no */}
        {estado === 'clinica' && (
          <div className="ap-clinica">
            <div className="ap-clinica-cab">
              <span className="ap-clinica-ico"><IcoClinica /></span>
              <div>
                <p className="ap-clinica-n">Clínica asociada: {cuenta.clinica?.nombre}</p>
                <p className="ap-clinica-d">Gratis para ti. Tu clínica te proporciona acceso a RuDaMi.</p>
              </div>
            </div>
            <div className="ap-clinica-pie"><IcoCheck size={12} /> <strong>Premium incluido</strong></div>
          </div>
        )}

        <div className={`ap-plan${estado === 'free' ? ' actual' : ''}`}>
          <div className="ap-plan-cab">
            <div>
              <p className="ap-plan-n">Free</p>
              <p className="ap-plan-s">Empieza a cuidar tu recuperación.</p>
            </div>
            <div className="ap-plan-precio"><strong>0 €</strong><span>para siempre</span></div>
          </div>
          <Lista items={FREE} />
          {estado === 'free' && <p className="ap-plan-ok"><IcoCheck size={14} /> Tu plan actual</p>}
        </div>

        <div className={`ap-plan${estado === 'premium' ? ' actual' : estado === 'free' ? ' destacado' : ''}`}>
          <div className="ap-plan-cab">
            <div>
              <p className="ap-plan-n" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IcoEstrella size={16} /> Premium</p>
              <p className="ap-plan-s">Tu recuperación, personalizada.</p>
            </div>
            <div className="ap-plan-precio">
              <strong>4,99 €</strong><span>al mes</span>
              <em>o 49,99 €/año</em>
            </div>
          </div>
          <p className="ap-plan-s" style={{ marginTop: 12 }}>Todo lo de Free, y además:</p>
          <Lista items={PREMIUM} />
          <Lista items={PRONTO} pronto />

          {estado === 'premium' ? (
            <p className="ap-plan-ok">
              <IcoCheck size={14} /> Tu plan actual{cuenta.plan.hasta ? ` · hasta el ${fechaLarga(cuenta.plan.hasta)}` : ''}
            </p>
          ) : estado === 'clinica' ? (
            <p className="ap-plan-ok"><IcoCheck size={14} /> Incluido por tu clínica</p>
          ) : interes ? (
            <>
              <p className="ap-plan-ok"><IcoCheck size={14} /> Apuntado. Te avisaremos al correo.</p>
              <p className="ap-plan-nota">
                Los pagos aún no están activos: estamos preparando la pasarela. No se te cobrará nada
                hasta que lo actives tú, y el precio de lanzamiento se respetará.
              </p>
            </>
          ) : (
            <>
              <button type="button" className="ap-btn" disabled={ocupado} onClick={quiero}>
                {ocupado ? 'Un momento…' : 'Quiero Premium'}
              </button>
              <p className="ap-plan-nota">
                Los pagos aún no están activos. Al pulsar te apuntamos y te avisamos cuando puedas
                activarlo; no se cobra nada ahora.
              </p>
            </>
          )}
        </div>

        {estado !== 'clinica' && (
          <div className="ap-plan">
            <div className="ap-plan-cab">
              <div>
                <p className="ap-plan-n">¿Vas a una clínica?</p>
                <p className="ap-plan-s">Si tu clínica usa RuDaMi, para ti es gratis y con Premium incluido.</p>
              </div>
              <div className="ap-plan-precio"><strong>0 €</strong><span>lo paga tu clínica</span></div>
            </div>
            <Lista items={CLINICA} />
            <p className="ap-plan-nota">
              Pide a tu fisioterapeuta el enlace de tu plan y pulsa «Guarda tu progreso» con este
              mismo correo. Tu cuenta, tus rutinas y tu historial se conservan.
            </p>
          </div>
        )}
      </div>

      <p className="ap-bienvenida-pie" style={{ marginTop: 22 }}>
        Sin permanencia. Cancela cuando quieras desde <Link href="/mi/perfil/ajustes">ajustes</Link>.
      </p>

      <BarraMi activa="perfil" />
    </main>
  )
}
