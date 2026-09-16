// app/mi/chat/page.tsx
// Pestaña "Chat": el asistente de recuperación. Es Premium para el usuario
// sin clínica; el paciente de clínica lo tiene incluido (y comparte historial
// con el chat de su enlace /r/[token]).

import Link from 'next/link'
import { cargarCuenta, nombreCorto } from '@/app/lib/paciente/cuenta'
import type { MensajeChat } from '@/app/lib/paciente/tipos'
import { esPremium } from '@/app/lib/paciente/tipos'
import { ChatIA } from '@/components/paciente/ChatIA'
import { BarraMi } from '@/components/paciente/BarraMi'
import { Cabecera } from '@/components/paciente/Cabecera'
import { IcoChispa } from '@/components/paciente/Iconos'

export const revalidate = 0

export default async function PaginaChat() {
  const { supabase, cuenta } = await cargarCuenta()

  if (!esPremium(cuenta)) {
    return (
      <main className="ap-pagina">
        <Cabecera titulo="Chat con IA" grande />
        <div className="ap-premium-card">
          <span className="ap-etiqueta premium"><IcoChispa size={12} /> Premium</span>
          <p className="ap-premium-t">Tu fisioterapeuta digital, siempre contigo</p>
          <p className="ap-premium-d">
            Pregunta cómo hacer un ejercicio, qué es normal sentir o qué hacer si un día
            no puedes. Responde sobre tus rutinas, con guardarraíles clínicos: nunca
            diagnostica y siempre te manda a un profesional si algo no cuadra.
          </p>
          <Link href="/mi/plan" className="ap-btn">Ver Premium</Link>
        </div>
        <p className="ap-bienvenida-pie" style={{ marginTop: 20 }}>
          ¿Vas a una clínica? Si usa RuDaMi, lo tienes incluido: abre el enlace que te enviaron.
        </p>
        <BarraMi activa="chat" />
      </main>
    )
  }

  const { data } = await supabase.rpc('mi_chat')

  return (
    <ChatIA
      nombre={nombreCorto(cuenta)}
      mensajes={(data as MensajeChat[] | null) ?? []}
      conPlan={cuenta.tipo === 'independiente' || cuenta.tiene_plan_fisio}
      esClinica={cuenta.tipo === 'clinica'}
    />
  )
}
