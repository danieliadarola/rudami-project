'use client'

import { useState } from 'react'
import Link from 'next/link'
import MenuPaciente from './MenuPaciente'

interface Paciente {
  id: string
  nombre: string
  apellidos: string
  motivo_consulta: string
  email: string
  telefono: string
  user_id: string
}

interface Props {
  pacientes: Paciente[]
  esAdmin: boolean
}

export default function ListaPacientes({ pacientes, esAdmin }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellidos} ${p.motivo_consulta} ${p.telefono || ''} ${p.email || ''}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  const avatarColor = (index: number) => {
    const colores = [
      { bg: '#eff6ff', color: '#2563eb', border: '#dbeafe' },
      { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
      { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
      { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    ]
    return colores[index % colores.length]
  }

  const iniciales = (nombre: string, apellidos: string) =>
    `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.3px' }}>
          {esAdmin ? 'Pacientes de la clínica' : 'Mis pacientes'}
          <span style={{ fontSize: '13px', fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>
            {busqueda ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}` : `${pacientes.length} total`}
          </span>
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '8px 14px', fontSize: '13px', color: '#1e293b', width: '200px', outline: 'none' }}
          />
          <Link
            href="/pacientes/nuevo"
            style={{ background: '#0f172a', color: 'white', padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}
          >
            + Nuevo paciente
          </Link>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '32px 0' }}>
          {busqueda ? `No se encontraron pacientes con "${busqueda}"` : 'No hay pacientes registrados.'}
        </p>
      ) : (
        <div>
          {filtrados.map((paciente, index) => {
            const color = avatarColor(index)
            return (
              <div key={paciente.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 0', borderBottom: index < filtrados.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <Link href={`/pacientes/${paciente.id}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, textDecoration: 'none' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: color.color, flexShrink: 0, border: `2px solid ${color.border}` }}>
                    {iniciales(paciente.nombre, paciente.apellidos)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {paciente.nombre} {paciente.apellidos}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {paciente.motivo_consulta}
                    </div>
                  </div>
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{paciente.telefono}</span>
                </div>
                <MenuPaciente id={paciente.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}