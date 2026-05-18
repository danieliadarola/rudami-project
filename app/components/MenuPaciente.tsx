'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function MenuPaciente({ id }: { id: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false)
        setConfirmando(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const handleEliminar = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar el paciente.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault()
          setAbierto(!abierto)
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="2" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="8" cy="14" r="1.5"/>
        </svg>
      </button>

      {abierto && !confirmando && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-sm z-10 w-44 overflow-hidden">
          <button
            onClick={(e) => {
              e.preventDefault()
              router.push(`/pacientes/${id}`)
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ver ficha
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              router.push(`/pacientes/${id}/editar`)
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              setConfirmando(true)
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100"
          >
            Eliminar paciente
          </button>
        </div>
      )}

      {confirmando && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-sm z-10 w-56 p-4">
          <p className="text-sm text-gray-700 font-medium mb-1">¿Eliminar paciente?</p>
          <p className="text-xs text-gray-400 mb-3">Se eliminarán todas sus sesiones y datos.</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.preventDefault()
                setConfirmando(false)
                setAbierto(false)
              }}
              className="flex-1 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleEliminar()
              }}
              disabled={loading}
              className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}