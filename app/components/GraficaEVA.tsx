'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface Props {
  sesiones: {
    fecha: string
    dolor_eva: number
  }[]
}

export default function GraficaEVA({ sesiones }: Props) {
  const datos = [...sesiones]
    .reverse()
    .map((s) => ({
      fecha: new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      }),
      eva: s.dolor_eva,
    }))

  if (datos.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Evolución del dolor EVA</h2>
        <p className="text-gray-400 text-sm text-center py-6">
          Necesitas al menos 2 sesiones para ver la gráfica.
        </p>
      </div>
    )
  }

  const colorLinea = () => {
    const primera = datos[0].eva
    const ultima = datos[datos.length - 1].eva
    if (ultima < primera) return '#16a34a'
    if (ultima > primera) return '#dc2626'
    return '#2563eb'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const eva = payload[0].value
      return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-900">EVA: {eva}/10</p>
          <p className="text-xs" style={{ color: colorLinea() }}>
            {eva <= 3 ? 'Dolor leve' : eva <= 6 ? 'Dolor moderado' : 'Dolor intenso'}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Evolución del dolor EVA</h2>
          <p className="text-xs text-gray-400 mt-0.5">{datos.length} sesiones registradas</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Mejora
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            Empeora
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Estable
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={datos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={3} stroke="#86efac" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={6} stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="eva"
            stroke={colorLinea()}
            strokeWidth={2.5}
            dot={{ fill: colorLinea(), strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-400">Primera sesión</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{datos[0].eva}/10</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Evolución</p>
          <p className={`text-lg font-bold mt-0.5 ${
            datos[datos.length - 1].eva < datos[0].eva
              ? 'text-green-600'
              : datos[datos.length - 1].eva > datos[0].eva
              ? 'text-red-600'
              : 'text-blue-600'
          }`}>
            {datos[datos.length - 1].eva - datos[0].eva > 0 ? '+' : ''}
            {datos[datos.length - 1].eva - datos[0].eva} pts
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Última sesión</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{datos[datos.length - 1].eva}/10</p>
        </div>
      </div>
    </div>
  )
}