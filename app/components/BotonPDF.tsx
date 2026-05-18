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
  }
}

export default function BotonPDF({ paciente, sesion }: Props) {
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
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(linea, margen, y)
        y += tamanyo * 0.5
      })
      y += 3
    }

    const addSeccion = (titulo: string, contenido: string, color: [number, number, number]) => {
      y += 4
      doc.setFillColor(...color)
      doc.roundedRect(margen - 2, y - 5, 174, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      addLinea(titulo, 10, true)
      doc.setTextColor(0, 0, 0)
      if (contenido) addLinea(contenido, 9)
      y += 2
    }

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RuDaMi Project', margen, 15)
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

    if (sesion.diagnostico_ia) {
      y += 4
      doc.line(margen, y, 190, y)
      y += 6
      addLinea('INFORME GENERADO POR IA', 12, true)
      y += 2

      const informe = sesion.diagnostico_ia

      const extraerSeccion = (desde: string, hasta: string) => {
        const partes = informe.split(desde)
        if (partes.length < 2) return ''
        return hasta ? partes[1].split(hasta)[0].trim() : partes[1].trim()
      }

      const hipotesis = extraerSeccion('**HIPÓTESIS DIAGNÓSTICA**', '**DIAGNÓSTICO DIFERENCIAL**')
      const diferencial = extraerSeccion('**DIAGNÓSTICO DIFERENCIAL**', '**RED FLAGS**')
      const redFlags = extraerSeccion('**RED FLAGS**', '**PRUEBAS COMPLEMENTARIAS RECOMENDADAS**')
      const pruebas = extraerSeccion('**PRUEBAS COMPLEMENTARIAS RECOMENDADAS**', '**PLAN DE TRATAMIENTO PROPUESTO**')
      const plan = extraerSeccion('**PLAN DE TRATAMIENTO PROPUESTO**', '')

      if (hipotesis) addSeccion('HIPOTESIS DIAGNOSTICA', hipotesis, [37, 99, 235])
      if (diferencial) addSeccion('DIAGNOSTICO DIFERENCIAL', diferencial, [109, 40, 217])
      if (redFlags) addSeccion('RED FLAGS', redFlags, [220, 38, 38])
      if (pruebas) addSeccion('PRUEBAS COMPLEMENTARIAS', pruebas, [217, 119, 6])
      if (plan) addSeccion('PLAN DE TRATAMIENTO', plan, [22, 163, 74])
    }

    y += 10
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Generado por RuDaMi Project el ${new Date().toLocaleDateString('es-ES')}`, margen, y)

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