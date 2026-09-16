// app/api/keepalive/route.ts
// Mantener despierta la base de datos, versión Vercel Cron.
//
// POR QUÉ EXISTE (además del workflow de GitHub): el plan gratuito de Supabase
// pausa el proyecto tras ~7 días sin actividad. El workflow de GitHub
// necesita dos secretos que hay que poner a mano en Settings → Secrets y, si
// no están, falla en silencio. Este endpoint usa las variables que Vercel YA
// tiene (las mismas del bundle) y lo dispara el cron de vercel.json. Vercel
// Hobby permite crons diarios sin coste.
//
// Qué hace: una llamada a informe_publico() con un token inventado. Devuelve
// null, no lee ningún dato, pero toca Postgres de verdad.
//
// Seguridad: si se define CRON_SECRET en Vercel, solo acepta llamadas con
// `Authorization: Bearer <secret>` (Vercel lo añade solo). Sin él, el endpoint
// es público pero inocuo: lo peor que puede hacer alguien es despertar la base.

import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Faltan variables de Supabase' }, { status: 500 })
  }

  const inicio = Date.now()
  try {
    const r = await fetch(`${url}/rest/v1/rpc/informe_publico`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: 'keepalive-no-existe' }),
      cache: 'no-store',
    })
    return NextResponse.json({ ok: r.ok, status: r.status, ms: Date.now() - inicio, at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), at: new Date().toISOString() }, { status: 502 })
  }
}
