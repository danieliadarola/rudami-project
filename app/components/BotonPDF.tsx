'use client'

import { useState } from 'react'

interface Props {
  paciente: {
    nombre: string
    apellidos: string
    fecha_nacimiento: string
    telefono: string
    email: string
    genero: string
    ocupacion: string
    motivo_consulta: string
    antecedentes: string
  }
  sesion: {
    fecha: string
    anamnesis: string
    exploracion_fisica: string
    dolor_eva: number
    notas: string
    diagnostico_ia: string
    derivacion?: boolean
  }
  fisio?: {
    nombre?: string
    apellidos?: string
    numero_colegiado?: string
  }
}

// Extractor robusto: corta desde el título hasta el siguiente **TÍTULO**.
function extraerSeccion(texto: string, seccion: string): string {
  if (!texto || !texto.includes(seccion)) return ''
  const partes = texto.split(seccion)
  if (partes.length < 2) return ''
  const resto = partes[1]
  const siguiente = resto.match(/\n\*\*[A-ZÁÉÍÓÚÑ][^*]+\*\*/)
  return siguiente && siguiente.index !== undefined
    ? resto.slice(0, siguiente.index).trim()
    : resto.trim()
}

export default function BotonPDF({ paciente, sesion, fisio }: Props) {
  const [loading, setLoading] = useState(false)

  const generarPDF = async () => {
    setLoading(true)

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const margen = 20
    let y = 20

    const addLinea = (texto: string, tamanyo = 10, negrita = false) => {
      doc.setFontSize(tamanyo)
      doc.setFont('helvetica', negrita ? 'bold' : 'normal')
      const lineas = doc.splitTextToSize(texto, 170)
      lineas.forEach((linea: string) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(linea, margen, y)
        y += tamanyo * 0.5
      })
      y += 3
    }

    const addSeccion = (titulo: string, contenido: string, color: [number, number, number]) => {
      if (!contenido) return
      y += 4
      if (y > 265) { doc.addPage(); y = 20 }
      doc.setFillColor(...color)
      doc.roundedRect(margen - 2, y - 5, 174, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      addLinea(titulo, 10, true)
      doc.setTextColor(0, 0, 0)
      addLinea(contenido, 9)
      y += 2
    }

    doc.setFillColor(26, 39, 68) // navy de marca
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RuDaMi', margen, 15)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Informe de sesion clinica', margen, 25)
    doc.setTextColor(0, 0, 0)
    y = 45

    addLinea(`Paciente: ${paciente.nombre} ${paciente.apellidos}`, 13, true)
    addLinea(`Fecha de sesion: ${sesion.fecha}`, 10)
    addLinea(`Fecha de nacimiento: ${paciente.fecha_nacimiento ?? '—'}`, 10)
    addLinea(`Telefono: ${paciente.telefono ?? '—'}  |  Email: ${paciente.email ?? '—'}`, 10)
    addLinea(`Ocupacion: ${paciente.ocupacion ?? '—'}  |  Genero: ${paciente.genero ?? '—'}`, 10)

    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(margen, y, 190, y)
    y += 6

    addLinea('Motivo de consulta', 10, true)
    addLinea(paciente.motivo_consulta ?? '—', 9)

    if (paciente.antecedentes) {
      addLinea('Antecedentes relevantes', 10, true)
      addLinea(paciente.antecedentes, 9)
    }

    y += 2
    doc.line(margen, y, 190, y)
    y += 6

    addLinea('Anamnesis de la sesion', 10, true)
    addLinea(sesion.anamnesis ?? '—', 9)

    addLinea('Exploracion fisica', 10, true)
    addLinea(sesion.exploracion_fisica ?? '—', 9)

    addLinea(`Dolor EVA: ${sesion.dolor_eva}/10`, 10, true)

    if (sesion.notas) {
      addLinea('Notas adicionales', 10, true)
      addLinea(sesion.notas, 9)
    }

    const informe = sesion.diagnostico_ia
    if (informe) {
      y += 4
      doc.line(margen, y, 190, y)
      y += 6
      addLinea('INFORME GENERADO POR IA', 12, true)
      y += 2

      const clasificacion = extraerSeccion(informe, '**CLASIFICACIÓN CLÍNICA**')
      const tejidos       = extraerSeccion(informe, '**TEJIDOS Y ESTRUCTURAS IMPLICADAS**')
      const hipotesis     = extraerSeccion(informe, '**HIPÓTESIS DIAGNÓSTICA PRINCIPAL**')
      const diferencial   = extraerSeccion(informe, '**DIAGNÓSTICO DIFERENCIAL**')
      const redFlags      = extraerSeccion(informe, '**RED FLAGS**')
      const yellowFlags   = extraerSeccion(informe, '**YELLOW FLAGS**')
      const derivacion    = extraerSeccion(informe, '**DERIVACIÓN MÉDICA**')
      const pruebas       = extraerSeccion(informe, '**EXPLORACIÓN COMPLEMENTARIA RECOMENDADA**')
      const plan          = extraerSeccion(informe, '**PLAN DE TRATAMIENTO PROPUESTO**')
      const educacion     = extraerSeccion(informe, '**EDUCACIÓN AL PACIENTE**')
      const pronostico    = extraerSeccion(informe, '**PRONÓSTICO**')

      // Banderas de seguridad primero, destacadas.
      addSeccion('RED FLAGS', redFlags, [220, 38, 38])
      addSeccion('DERIVACION MEDICA', derivacion, [217, 119, 6])

      addSeccion('CLASIFICACION CLINICA', clasificacion, [71, 85, 105])
      addSeccion('HIPOTESIS DIAGNOSTICA', hipotesis, [37, 99, 235])
      addSeccion('TEJIDOS Y ESTRUCTURAS', tejidos, [180, 83, 9])
      addSeccion('DIAGNOSTICO DIFERENCIAL', diferencial, [109, 40, 217])
      addSeccion('YELLOW FLAGS', yellowFlags, [202, 138, 4])
      addSeccion('EXPLORACION COMPLEMENTARIA', pruebas, [13, 148, 136])
      addSeccion('PLAN DE TRATAMIENTO', plan, [22, 163, 74])
      addSeccion('EDUCACION AL PACIENTE', educacion, [79, 70, 229])
      addSeccion('PRONOSTICO', pronostico, [71, 85, 105])
    }

    // ── Sello clínico ──
    if (y > 255) { doc.addPage(); y = 20 }
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margen, y, 190, y)
    y += 6
    doc.setFontSize(8)
    doc.setTextColor(110, 120, 136)
    const disclaimer =
      'Informe de soporte a la decision clinica generado con IA. No constituye diagnostico medico ni sustituye el juicio del fisioterapeuta colegiado responsable.'
    doc.splitTextToSize(disclaimer, 170).forEach((l: string) => { doc.text(l, margen, y); y += 4 })
    if (fisio && (fisio.nombre || fisio.numero_colegiado)) {
      const resp = `Responsable: ${fisio.nombre ?? ''} ${fisio.apellidos ?? ''}`.trim() +
        (fisio.numero_colegiado ? ` - N. colegiado ${fisio.numero_colegiado}` : '')
      doc.text(resp, margen, y); y += 4
    }
    doc.text(`Generado por RuDaMi el ${new Date().toLocaleDateString('es-ES')}`, margen, y)

    doc.save(`informe_${paciente.apellidos}_${sesion.fecha}.pdf`)
    setLoading(false)
  }

  return (
    <button
      onClick={generarPDF}
      disabled={loading}
      className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading ? 'Generando...' : '📄 Exportar PDF'}
    </button>
  )
}
