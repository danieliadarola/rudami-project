// app/lib/voz.ts
// Tipos de la API de reconocimiento de voz del navegador.
//
// POR QUÉ ESTE ARCHIVO: `SpeechRecognition` no está en los tipos del DOM que
// trae TypeScript, porque sigue siendo un borrador del W3C y en la práctica
// solo la implementa Chrome (con el prefijo `webkit`). Sin esto, los dos
// sitios que dictan por voz tendrían que usar `any` y perder toda ayuda del
// editor. Se declara solo lo que usamos, no la especificación entera.

export interface AlternativaVoz { transcript: string }
export interface ResultadoVoz extends ArrayLike<AlternativaVoz> { isFinal: boolean }
export interface EventoVoz { resultIndex: number; results: ArrayLike<ResultadoVoz> }

export interface ReconocimientoVoz {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((e: EventoVoz) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type ConstructorVoz = new () => ReconocimientoVoz

/** Devuelve el constructor del navegador, o null si no lo soporta. */
export function constructorVoz(): ConstructorVoz | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: ConstructorVoz
    webkitSpeechRecognition?: ConstructorVoz
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
