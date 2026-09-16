# 03 · La app del paciente v2: Free, Premium y Clinic

*App v2 · Escrito el 16/09/2026*

---

## 1. El problema

Hasta hoy la app `/mi` solo existía para una persona: el paciente de una
clínica que usa RuDaMi. Su identidad era una fila de `pacientes`, su plan era
el informe que publicaba su fisio, y todo lo demás (citas, bono, chat) colgaba
de esa fila. Quien no tuviera clínica no tenía nada que hacer en la app.

El 16/09/2026 se decidió otra cosa: **la app es para todo el mundo**, con tres
planes. Free (0 €) para empezar, Premium (4,99 €/mes · 49,99 €/año) con la IA,
la biblioteca completa, estadísticas y objetivos, y Clinic, que es el paciente
de siempre pero con un cambio de lectura: **Premium incluido, porque su
clínica paga**. Dos consecuencias técnicas grandes. Uno: hace falta una
identidad que no dependa de `pacientes`. Dos: hacen falta rutinas que no
dependan de un fisio, es decir, una biblioteca de programas. Y todo ello sin
tocar el modelo de seguridad, que sigue siendo *el paciente no tiene acceso
directo a ninguna tabla*.

---

## 2. El mapa

```
                      /mi/entrar
          ┌───────────────┼──────────────────┐
     "Iniciar sesión"   "Crear cuenta"    /r/[token] → "Guarda tu progreso"
          │                │ (?n=nombre)        │ (?t=token)
          └────────────────┴──── enlace mágico ─┘
                              /mi/callback
                     paciente_vincular(t)  ·  mi_cuenta_crear(n)
                                   │
                              mi_cuenta()
                 ┌─────────────────┴──────────────────┐
           tipo: 'clinica'                    tipo: 'independiente'
         plan.estado: 'clinica'             plan.estado: 'free' | 'premium'
                 │                                    │
    mi_plan()  mi_citas()  guia_chat           mi_rutinas()  app_chat
         └──────── mi_biblioteca() · mi_programa() · app_checks ────────┘

   Tablas nuevas (RLS activa, CERO policies para el paciente):
   app_usuarios · programas · programa_ejercicios · app_programas
   app_checks · app_chat · citas_solicitudes (esta sí: policy para la CLÍNICA)
```

Cada pantalla empieza igual: `cargarCuenta()` en el servidor, que devuelve el
cliente de Supabase ya creado y el resultado de `mi_cuenta()`
(`app/lib/paciente/cuenta.ts:12`). A partir de ahí, la página pide lo que
necesita y el componente de cliente solo escribe por RPC.

---

## 3. El recorrido

### 3.1 Una cuenta para todos, sin romper la del paciente de clínica

`app_usuarios` es la cuenta de la app. Existe para todo el que entra en `/mi`,
pero el plan solo importa a quien no tiene clínica. La fila se crea siempre
desde el callback del enlace mágico, sea quien sea:

```ts
// app/mi/callback/route.ts:63
await supabase.rpc('mi_cuenta_crear', { p_nombre: nombre?.slice(0, 80) ?? null })
```

Y la RPC es idempotente a propósito
(`supabase/migrations/20260916100000_app_paciente_cuentas_programas_citas.sql:151`):

```sql
insert into app_usuarios (user_id, nombre)
values (v_uid, nullif(trim(coalesce(p_nombre, '')), ''))
on conflict (user_id) do update
  set nombre = coalesce(app_usuarios.nombre, excluded.nombre);
```

Al paciente de clínica no le cambia nada (su nombre sale de `pacientes`). Al
independiente le guarda el nombre la primera vez y a partir de ahí lo respeta.

El nombre tiene que sobrevivir al viaje por el correo, igual que el token de la
fase 1B. Se mete en la URL de vuelta (`components/paciente/FormularioEntrar.tsx:38`):

```ts
const destino = new URL('/mi/callback', window.location.origin)
if (token) destino.searchParams.set('t', token)
if (nuevo && nombre.trim()) destino.searchParams.set('n', nombre.trim().slice(0, 80))
```

### 3.2 `mi_cuenta()`: quién eres y qué plan tienes

Es la RPC que decide todo lo demás. El estado del plan es un `case` en SQL
(migración, línea 212):

```sql
'plan', case
  when yo.paciente_id is not null then
    jsonb_build_object('estado', 'clinica', 'hasta', null, 'interes', false)
  when cu.plan = 'premium' and cu.premium_hasta is not null and cu.premium_hasta >= hoy.d then
    jsonb_build_object('estado', 'premium', 'hasta', cu.premium_hasta, 'interes', false)
  else
    jsonb_build_object('estado', 'free', 'hasta', null, 'interes', cu.premium_interes_at is not null)
end,
```

Fíjate en el orden: **tener ficha de paciente gana a todo**. Da igual lo que
ponga en `app_usuarios`: si `paciente_actual()` devuelve algo, el estado es
`'clinica'` y eso, en la app, significa Premium. Es la regla de negocio "el
paciente nunca paga por ver lo que le manda su fisio" escrita en un solo sitio.

En TypeScript la pregunta "¿tiene Premium?" se contesta con un helper para no
repetir la comparación en veinte componentes (`app/lib/paciente/tipos.ts:174`):

```ts
export const esPremium = (c: Pick<CuentaPaciente, 'plan'> | null | undefined): boolean =>
  c?.plan.estado === 'clinica' || c?.plan.estado === 'premium'
```

### 3.3 La biblioteca: programas sobre `ejercicios`, enlazados por nombre

Un programa es una lista ordenada de ejercicios de la tabla `ejercicios` con
su dosis (series, repeticiones, descanso). Cinco programas de semilla, 28
ejercicios. La semilla no usa ids: enlaza **por nombre** (migración, línea 712):

```sql
) as v(slug, nombre, orden, series, reps, descanso, duracion)
join public.programas p on p.slug = v.slug
join public.ejercicios e on e.nombre = v.nombre
where not exists (select 1 from public.programa_ejercicios x where x.programa_id = p.id);
```

Si un nombre no coincide, el ejercicio simplemente no entra: por eso al aplicar
se contó que los cinco programas tenían 6/6/5/5/6 ejercicios, exactamente los
de la lista. Si algún día renombras un ejercicio en la biblioteca, el programa
lo conserva (la FK es por id); es solo la semilla la que va por nombre.

La pieza clave es `programa_ejercicio_json()` (migración, línea 246). Devuelve
un ejercicio de programa **con la misma forma que un ejercicio de la guía**
(`EjercicioGuia`), y su `id` es el de `programa_ejercicios`, que es lo que se
marca:

```sql
select jsonb_build_object(
  'id',            pe.id,
  'nombre',        e.nombre,
  'instrucciones', e.instrucciones,
  'series',        pe.series,
  'repeticiones',  pe.repeticiones,
  'frecuencia',    p.frecuencia,
  ...
  'nota',          null,
```

Gracias a eso `SesionGuiada`, el detalle de ejercicio y las tarjetas no saben
si un ejercicio viene del fisio o de la biblioteca. Lo único que cambia es a
qué RPC se marca, y eso lo decide una sola línea
(`components/paciente/ProgramaDetalle.tsx:73`):

```ts
const { data, error } = fuente === 'plan'
  ? await supabase.rpc('mi_marcar_ejercicio', { p_ejercicio_id: e.id, p_hecho: hecho })
  : await supabase.rpc('mi_programa_marcar', { p_pe_id: e.id, p_hecho: hecho })
```

### 3.4 El plan del fisio como una rutina más

`/mi/rutinas/[id]` acepta `plan` como id. En ese caso la página convierte
`mi_plan()` en un programa virtual (`app/mi/rutinas/[id]/page.tsx:27`):

```ts
const virtual: TarjetaPrograma = {
  id: 'plan', slug: 'plan', titulo: 'Plan de tu fisioterapeuta',
  descripcion: p.informe.resumen, zona: null, nivel: null, semanas: 0,
  frecuencia: p.ejercicios[0]?.frecuencia ?? null, premium: false,
  imagen_url: p.ejercicios[0] ? miniaturaEjercicio(p.ejercicios[0]) : null,
  n_ejercicios: p.ejercicios.length, inscrito: true, activo: true,
  ...
```

El detalle es el mismo componente. La portada hace lo propio para decidir qué
es "tu plan de hoy" (`components/paciente/PortadaPaciente.tsx:53`): el del
fisio si existe, y si no el primer programa activo, cuyo detalle solo se pide
en ese caso (`app/mi/page.tsx:32`).

### 3.5 Las puertas de Premium están en SQL, no en la interfaz

La interfaz enseña el candado, pero quien decide es la RPC. Activar un programa
Premium (migración, línea 396):

```sql
if p_activo and exists (select 1 from programas where id = p_id and premium)
   and (public.mi_cuenta() -> 'plan' ->> 'estado') not in ('clinica', 'premium') then
  return jsonb_build_object('ok', false, 'premium', true);
end if;
```

Y el chat del independiente (línea 558):

```sql
select (mi_cuenta() -> 'plan' ->> 'estado') into v_estado;
if v_estado <> 'premium' then
  return jsonb_build_object('ok', false, 'premium', true);
end if;
```

La respuesta `{ok: false, premium: true}` es el contrato: el cliente la
traduce en "te llevo a /mi/plan". Un usuario que se salte la interfaz y llame a
la RPC a mano recibe lo mismo.

### 3.6 Dos chats, un historial por persona

El paciente de clínica ya tenía chat en `/r/[token]`, guardado en `guia_chat`
contra su informe. La app **no crea otro**: `mi_chat_insertar` escribe en la
misma tabla si `paciente_actual()` devuelve algo, con el mismo límite de la
clínica. Solo el independiente va a `app_chat`.

La ruta `/api/mi/chat` es gemela de `/api/guia`, con la autorización cambiada
de token a sesión (`app/api/mi/chat/route.ts:35`):

```ts
const { data: reg } = await supabase.rpc('mi_chat_insertar', { p_rol: 'paciente', p_texto: pregunta.trim() })
if (!reg?.ok) {
  if (reg?.limite) { ... }
  if (reg?.premium) return NextResponse.json({ error: 'El asistente es Premium' }, { status: 403 })
```

El contexto que ve el modelo se construye según el tipo (`route.ts:50`): el
plan del fisio, o hasta tres programas activos con sus ejercicios. Nunca una
tabla. Y el prompt cambia de guardarraíles: al independiente no se le puede
decir "habla con tu fisio" porque no tiene. `promptGuiaChat` delega
(`app/lib/ai/prompts.ts:258`):

```ts
if (d.modo_app === 'independiente') return promptAppChatLibre(d)
```

### 3.7 Citas: el paciente solicita, la clínica decide

`citas_solicitudes` es la única tabla nueva con policy, y es para la clínica
(migración, línea 130):

```sql
create policy citas_solicitudes_clinica_select on public.citas_solicitudes
  for select to authenticated using (clinica_id = public.clinica_actual());
```

El paciente escribe por `mi_cita_solicitar`, que exige que la cita sea suya,
futura y no cancelada (línea 477), y sustituye la solicitud pendiente anterior
si la hay. La clínica la ve en la barra lateral de `/citas`
(`components/citas/SolicitudesCitas.tsx`), y ahí sí se lee y escribe la tabla
directamente, porque quien mira es la clínica y la policy lo permite:

```ts
// components/citas/SolicitudesCitas.tsx:55
if (estado === 'aceptada' && s.tipo === 'cancelacion') {
  const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', s.cita_id)
  if (error) throw error
}
const { error } = await supabase.from('citas_solicitudes').update({ estado }).eq('id', s.id)
```

Aceptar una cancelación cancela la cita. Aceptar un cambio abre el formulario
de reprogramar con la cita original todavía en pie: no se deja al paciente sin
cita mientras se elige la nueva fecha.

### 3.8 El calendario es propio

FullCalendar pesa unos 200 KB y está hecho para la agenda del fisio en
escritorio. El del paciente es una rejilla de 7 columnas
(`components/paciente/Calendario.tsx:53`). Lo único delicado es la fecha de una
cita: `fecha_hora` es un `timestamptz`, y "qué día es" depende de la zona
(`Calendario.tsx:19`):

```ts
const fechaDe = (c: CitaPaciente) =>
  new Date(c.fecha_hora).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }) // 'YYYY-MM-DD'
```

El locale sueco es un truco conocido: es el que formatea como ISO. Y se fuerza
Europe/Madrid por la misma razón que el `hoy` viene del servidor: el móvil del
paciente puede estar en otra zona.

### 3.9 Sin Stripe, sin fingir

El botón "Quiero Premium" no activa nada (`components/paciente/Planes.tsx:37`):

```ts
const quiero = async () => {
  setOcupado(true)
  const { data } = await supabase.rpc('mi_premium_interes')
  setOcupado(false)
  if (data?.ok) setInteres(true)
}
```

Registra `premium_interes_at` y la pantalla dice, literalmente, que los pagos
aún no están activos. Cuando llegue Stripe, el webhook solo tendrá que escribir
`plan = 'premium'` y `premium_hasta`; `mi_cuenta()` hará el resto.

---

## 4. Las decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Tabla `app_usuarios` aparte para la cuenta | Meter al independiente en `pacientes` con `clinica_id` null | Todas las policies de la clínica cuelgan de `clinica_id`; una fila sin clínica sería un cuerpo extraño y mezclaría datos clínicos con cuentas de consumo. |
| Ficha de paciente gana al plan de `app_usuarios` | Comprobar los dos y combinarlos | Es la regla de negocio en una sola línea del `case`. Si mañana hay que cambiarla, está en un sitio. |
| Programas enlazados por nombre en la semilla | Ids fijos en la migración | Los ids de `ejercicios` son distintos en cada base; los nombres son los mismos. Y un nombre que no coincide falla en silencio, que es lo deseado en una semilla. |
| `programa_ejercicio_json` con la forma de `EjercicioGuia` | Un tipo nuevo y componentes duplicados | `SesionGuiada`, el detalle y las tarjetas se reutilizan tal cual. La única bifurcación es la RPC de marcar. |
| Chat del paciente de clínica en `guia_chat` | Tabla nueva para la app | Un mismo paciente alterna entre el enlace de WhatsApp y la app; con dos tablas tendría dos historiales y dos límites. |
| Puertas de Premium en las RPCs | Solo esconder botones | La interfaz se salta; SQL no. `{ok:false, premium:true}` es el contrato. |
| Calendario propio | FullCalendar (ya instalado) | 200 KB en un móvil por 4G para pintar 35 celdas. |
| Verde clínico como acento, oro solo para lo motivacional | Reutilizar el oro para todo, o el negro tinta de v3 | Los bocetos son verdes y el oro ya tenía un significado (racha, plan completado). Mezclarlos los habría diluido. |
| Sin Stripe: registrar interés | Activar Premium "de prueba" | Fingir un cobro o regalar Premium sin fecha de caducidad ensucia los datos del lanzamiento. |

---

## 5. Las trampas

**`from a, b left join c on ... a.x`** → `ERROR 42P01: invalid reference to
FROM-clause entry for table "a"`. La coma y el `join` no tienen la misma
precedencia: `b left join c` se resuelve antes y `a` no es visible en el `on`.
Arreglo: `from a left join c on ... cross join b`. Pasó en
`programa_tarjeta_json` y tumbó la migración entera (se aplica en transacción,
así que no quedó nada a medias).

**Probar RPCs con `set role authenticated` y una subconsulta a una tabla** →
la subconsulta devuelve null porque la RLS ya está activa para ese rol. Saca
los ids que necesites a una tabla temporal *antes* del `set_config('role', …)`,
y dale `grant` al rol sobre la temporal.

**Varias RPCs `stable` en un mismo `select … union all …`** ven la misma
instantánea: una escritura hecha por la primera no la ve la tercera. Para
encadenar (insertar y luego leer) usa sentencias separadas o inserta los
resultados en una tabla temporal, una RPC por sentencia.

**`setState` dentro de `useEffect`** es error de lint con `reactCompiler`
(`react-hooks/set-state-in-effect`). Para leer `localStorage` al montar, usa un
ref callback (`components/paciente/Ajustes.tsx:27`), la misma técnica que
`Revelar`.

**`Date.now()` durante el render** es error de lint (`react-hooks/purity`).
Compara con el `hoy` que manda el servidor; la RPC vuelve a comprobar que la
cita sea futura.

**Heredocs de Bash con CSS largo** fallan en este entorno con "unexpected EOF
while looking for matching `''`". Escribe el bloque a un archivo con la
herramienta de escritura y anéxalo con `cat`.

**`mi_estadisticas().objetivo_semanal` salía null** para quien aún no tenía
fila en `app_usuarios`: `(select coalesce(x, 3) …)` sin filas es null.
`coalesce((select x …), 3)` es lo correcto.

---

## 6. Compruébalo tú

**La bandeja de la clínica.** Entra como admin en `/citas`: si algún paciente
ha pedido un cambio desde su app, aparece "Solicitudes de pacientes" encima de
"Resumen hoy". Para provocar una sin esperar a nadie, en el editor SQL:

```sql
select mi_cita_solicitar('<uuid de una cita futura de Lucía>', 'cambio', 'cualquier tarde');
```
(ejecutado con `set role authenticated` y el `sub` de Lucía, como en el bloque
de abajo).

**La base, como un usuario sin clínica y sin fila de cuenta** (en el editor
SQL de Supabase; todo se deshace con el `rollback`):

```sql
begin;
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"libre@ejemplo.test","role":"authenticated"}', true);
select mi_cuenta() -> 'plan';                 -- {"estado":"free", ...}
select jsonb_array_length(mi_biblioteca());   -- 5
select mi_chat_insertar('paciente', 'hola');  -- {"ok":false,"premium":true}
select count(*) from programas;               -- 0: sin acceso directo
rollback;
```

**Las rutas, sin sesión** (con `npx next dev -p 3005` en marcha):

```bash
for r in /mi /mi/rutinas /mi/sesiones /mi/chat /mi/perfil /mi/plan; do
  curl -s -o /dev/null -w "$r -> %{http_code} %{redirect_url}\n" http://localhost:3005$r
done
curl -s -X POST -H 'Content-Type: application/json' -d '{"pregunta":"hola"}' \
  -w " %{http_code}\n" http://localhost:3005/api/mi/chat      # 401
```

**La app, con sesión.** Entra en `http://localhost:3005/mi/entrar`, pulsa
«Crear cuenta», pon un nombre y tu correo. Necesitas el SMTP configurado
(sigue pendiente; ver `CONTEXTO_FISIOAPP.md`). Ya dentro: `/mi/rutinas` →
Biblioteca → «Espalda sana» → «Añadir a mis rutinas» → marca un ejercicio.
Vuelve a `/mi`: el anillo y el carrusel lo reflejan. `/mi/chat` te enseña la
tarjeta de Premium; `/mi/plan`, los tres planes. Para verlo como paciente de
clínica, entra desde el enlace `/r/[token]` de Lucía Fernández con el correo
de su ficha: verás la tarjeta verde de su clínica, su bono y sus citas.
