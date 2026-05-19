'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function BotonCerrarEpisodio({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCerrar = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('episodios')
      .update({ estado: 'cerrado', fecha_fin: new Date().toISOString().split('T')[0] })
      .eq('id', id)

    if (error) {
      alert('Error al cerrar la consulta.')
      setLoading(false)
      return
    }
    router.refresh()
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">¿Cerrar consulta?</span>
        <button
          onClick={() => setConfirmando(false)}
          className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          No
        </button>
        <button
          onClick={handleCerrar}
          disabled={loading}
          className="text-xs bg-gray-600 text-white px-2 py-1 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Sí, cerrar'}
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
      className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
    >
      Cerrar consulta
    </button>
  )
}