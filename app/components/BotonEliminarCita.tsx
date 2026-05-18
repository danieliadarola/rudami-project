'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function BotonEliminarCita({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEliminar = async () => {
    setLoading(true)

    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar la cita.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (confirmando) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-sm text-red-600">¿Eliminar esta cita?</span>
        <button
          onClick={() => setConfirmando(false)}
          className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleEliminar}
          disabled={loading}
          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50"
    >
      Eliminar
    </button>
  )
}