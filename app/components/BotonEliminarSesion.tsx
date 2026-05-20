'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function BotonEliminarSesion({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEliminar = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('sesiones')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar la sesión.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-red-600">¿Eliminar sesión?</span>
        <button
          onClick={() => setConfirmando(false)}
          className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          No
        </button>
        <button
          onClick={handleEliminar}
          disabled={loading}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Sí'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setConfirmando(true)
      }}
      className="text-xs border border-red-200 text-red-400 px-2 py-1 rounded-lg hover:bg-red-50"
    >
      Eliminar
    </button>
  )
}