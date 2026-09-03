# 01 · La app del paciente

*Fases 1A, 1B y 2 · Escrito el 03/09/2026*

---

## 1. El problema

Antes de esto, un paciente solo podía ver su guía por un enlace de WhatsApp:
`/r/[token]`. Ese enlace es cómodo pero tiene un techo. El token vive dentro de
un informe concreto, así que el paciente solo ve **ese** informe: cuando el
fisio le publica el siguiente, el enlace viejo se queda mostrando el plan
antiguo. Y el enlace es la credencial: quien lo tenga entra, se comparta como se
comparta.

Lo que queríamos era una **app de verdad**: el paciente entra con su correo, ve
siempre su plan al día, su racha, su próxima cita y su evolución del dolor. Eso
significa darle **identidad**, y ahí empieza el problema real — porque el
paciente que inicia sesión en Supabase es rol `authenticated`, exactamente **el
mismo rol que un fisio**. Si no se hace bien, darle cuenta a un paciente es
abrirle la base de datos de la clínica.

---

## 2. El mapa

Dos puertas, dos formas de demostrar quién eres, un solo conjunto de datos.

```
   PUERTA A: el enlace                    PUERTA B: la cuenta
   (WhatsApp, sin login)                  (correo, con login)
           |                                       |
   /r/[token]                              /mi/entrar  ->  correo
           |                                       |
           |                              /mi/callback (canjea codigo)
           |                                       |
           |                              paciente_vincular(token)
           |                                       |
           v                                       v
   informe_publico(p_token)                 mi_plan() / mi_resumen()
   « quien eres? -> el token »       « quien eres? -> paciente_actual() »
           |                                       |
           +------------------+--------------------+
                              v
                     guia_payload(informe)      <-- LA FRONTERA
                     lista blanca de columnas
                              |
                              v
                   +---------------------+
                   |  informes           |  El paciente NO tiene
                   |  informe_ejercicios |  acceso directo a
                   |  guia_checks        |  ninguna de estas tablas.
                   |  citas ...          |  Cero policies nuevas.
                   +---------------------+
```

Lo importante del dibujo es la línea del medio. **Las dos puertas terminan en la
misma función.** Un paciente puede alternar entre su enlace de WhatsApp y la app
y ver exactamente lo mismo, porque el JSON lo construye un único sitio.

---

## 3. El recorrido

### 3.1 · La columna que ya existía y no servía

`pacientes` ya tenía una columna `user_id`. Parecía la buena. No lo era:

```sql
-- supabase/migrations/20260902100000_paciente_identidad.sql:20
-- OJO: `pacientes.user_id` NO sirve para esto. Es el fisio propietario de la
-- ficha (verificado: las 22 filas apuntan a un perfil de la clínica) y varias
-- policies dependen de ello. Hace falta columna propia.

alter table public.pacientes
  add column if not exists auth_user_id uuid unique
  references auth.users(id) on delete set null;
```

`user_id` es **el fisio dueño de la ficha**, no el paciente. Comprobado contra
la base real: las 22 filas apuntaban a perfiles de la clínica. Si lo hubiéramos
reutilizado, al vincular un paciente le habríamos robado la ficha a su fisio y
roto las policies que cuelgan de esa columna.

> **Regla que sale de aquí:** antes de reutilizar una columna que "suena bien",
> haz un `select` a los datos reales y mira a qué apuntan de verdad.

### 3.2 · Quién eres

```sql
-- 20260902100000_paciente_identidad.sql:37
create or replace function public.paciente_actual()
returns uuid
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select id from public.pacientes where auth_user_id = auth.uid()
$$;
```

Cuatro líneas, y son el eje de todo. Es el gemelo de `clinica_actual()`, que ya
usabas para la parte de la clínica. Ninguna función del paciente recibe nunca un
`paciente_id` como parámetro: **lo resuelven por dentro**. Si un parámetro no
existe, nadie puede manipularlo.

Fíjate en la portada:

```tsx
// app/mi/page.tsx:22
// Ninguna de las dos recibe un id: resuelven la identidad por dentro con
// paciente_actual(). No hay nada que un cliente pueda manipular.
const [{ data: resumen }, { data: plan }] = await Promise.all([
  supabase.rpc('mi_resumen'),
  supabase.rpc('mi_plan'),
])
```

Dos llamadas sin un solo argumento. No hay nada que trastear desde el navegador.

### 3.3 · Vincular la cuenta: por qué hacen falta dos factores

Tener el token **no basta** para conseguir una cuenta:

```sql
-- 20260902100000_paciente_identidad.sql:48
-- Doble factor deliberado: hace falta el TOKEN **y** controlar el EMAIL que la
-- clínica tiene en la ficha. Solo con el token no basta, porque el token da
-- acceso a un informe y la cuenta daría acceso a todo el historial: sería una
-- escalada.
```

Piénsalo como una escalera de privilegios. El token es la llave de una
habitación. La cuenta es la llave maestra del edificio: todo el historial, todas
las citas, todos los informes pasados y futuros. Cambiar una por otra
automáticamente sería regalar el edificio a quien encontró una llave suelta en
el grupo de WhatsApp de la familia.

Por eso al canjear se exige, además del token, que el correo con el que has
iniciado sesión **coincida con el que la clínica tiene apuntado en la ficha**.
Verificado: un intruso con un token robado pero otro correo recibe `no_coincide`
y se queda fuera.

### 3.4 · Lista blanca, no lista negra

Esta es la decisión con más recorrido a largo plazo de todo el bloque.

```sql
-- 20260902100000_paciente_identidad.sql:114
select jsonb_build_object(
  'informe', jsonb_build_object(
    'id',          i.id,
    'fecha',       i.fecha,
    'resumen',     i.resumen,
    'explicacion', i.explicacion,
    ...
    -- NO se publican: notas_fisio, token, paciente_id, episodio_id,
    -- sesion_id, clinica_id, fisio_id, estado, tipo_sesion, timestamps.
  ),
```

Lo tentador es lo corto: `to_jsonb(i) - 'notas_fisio' - 'token'`. Quitas lo malo
y ya está. **Y funciona — hoy.**

El día que le añadas a `informes` una columna `coste_estimado`, o
`riesgo_abandono`, o `nota_interna_2`, esa columna **se publica sola** en la
guía del paciente. Nadie escribe una línea de código, nadie revisa nada, y la
información interna aparece en el móvil del paciente.

Con la lista blanca, una columna nueva **no sale hasta que alguien la escriba
aquí a mano**. Es más largo de escribir una vez, y no te puede traicionar nunca.

> El coste es real: si añades un campo que *sí* debe ver el paciente y se te
> olvida ponerlo aquí, no aparece. **Ese es el fallo que quieres tener** — se ve
> al momento y no filtra nada.

### 3.5 · Las escrituras gemelas

La lista blanca dejó de publicar el token. Eso rompió algo que no era evidente:

```sql
-- 20260902160000_escrituras_paciente_por_identidad.sql:4
-- Las RPC existentes (guia_marcar_ejercicio, guia_checkin) se autorizan con el
-- TOKEN del informe. La app del paciente no lo tiene: la lista blanca de
-- guia_payload() dejó de publicarlo a propósito, porque es una credencial y no
-- un dato. Sin estas dos gemelas, un paciente con cuenta podría ver su plan
-- pero no marcar un solo ejercicio.
```

De ahí salen `mi_marcar_ejercicio()` y `mi_checkin()`. Hacen **exactamente lo
mismo** que sus hermanas `guia_*`; lo único que cambia es de dónde sacan la
autorización:

| | Autoriza con | La usa |
|---|---|---|
| `guia_marcar_ejercicio` | el token | enlace de WhatsApp, sin login |
| `mi_marcar_ejercicio` | `paciente_actual()` | la app, sin token |

Así un mismo paciente puede alternar entre el enlace y la app sin que le cambie
nada de lo que ve.

Y dentro, la comprobación que impide que un paciente marque ejercicios de otro:

```sql
-- 20260902160000_escrituras_paciente_por_identidad.sql:34
-- El ejercicio tiene que pertenecer a un informe PUBLICADO de ESTE paciente.
-- Sin esta comprobación, cualquier paciente con cuenta podría marcar
-- ejercicios de otro pasando un id ajeno.
select i.id into v_informe
from informes i
join informe_ejercicios e on e.informe_id = i.id and e.id = p_ejercicio_id
where i.paciente_id = v_paciente and i.estado = 'publicado';
```

`p_ejercicio_id` **sí** viene del navegador, así que es manipulable. La defensa
no es confiar en él: es exigir que ese id pertenezca a un informe publicado del
paciente que está pidiendo. Un id ajeno no encuentra fila y la función devuelve
`ok: false`.

### 3.6 · Dos puertas en el proxy

En Next.js 16 el middleware se llama `proxy.ts` (no `middleware.ts`). Aquí
conviven dos públicos y **cada uno rebota a su propia puerta**:

```ts
// proxy.ts:67
// Sin sesión en zona del paciente → a la puerta del paciente.
if (!user && esZonaPaciente(pathname)) {
  const url = request.nextUrl.clone()
  url.pathname = PUERTA_PACIENTE          // '/mi/entrar'
  url.searchParams.set('redirect', pathname)
  return NextResponse.redirect(url)
}

// Sin sesión en zona de la clínica → al login de la clínica.
if (!user && esZonaClinica(pathname)) {
  url.pathname = '/'
}
```

Mandar a una señora de 70 años con lumbalgia al login de gestión de la clínica
sería desconcertante. Cada zona tiene su puerta.

**El agujero que hay que evitar aquí** está en la lista de excepciones:

```ts
// proxy.ts:29
/**
 * Las dos rutas de /mi que tienen que funcionar SIN sesión:
 *  · /mi/entrar   — es donde se pide el enlace de acceso.
 *  · /mi/callback — es donde aterriza el enlace del correo. Protegerla sería
 *    un bucle: el paciente aún no tiene sesión precisamente porque viene a
 *    canjear el código que se la va a dar.
 */
const RUTAS_PACIENTE_PUBLICAS = [PUERTA_PACIENTE, '/mi/callback']
```

Si proteges `/mi/callback`, el paciente entra en un bucle infinito: llega del
correo sin sesión → el proxy le manda a `/mi/entrar` → pide otro enlace → llega
sin sesión otra vez. Para siempre.

Y una advertencia escrita en el propio archivo, que conviene no olvidar:

```ts
// proxy.ts:38
/**
 * Pista de enrutado, NUNCA de autorización.
 * ... Si alguien se la falsifica a mano, lo único que consigue es aterrizar en
 * una pantalla vacía: los permisos reales los siguen decidiendo la RLS y las
 * RPCs SECURITY DEFINER.
 */
const COOKIE_ROL = 'rudami-rol'
```

Una cookie que el navegador puede reescribir **jamás** puede decidir permisos.
Aquí solo decide a qué portada mandarte desde `/`, y falsificarla no da nada.

### 3.7 · La portada: el orden es el diseño

La decisión de diseño de verdad no es el color, es el **orden vertical**:

```tsx
// components/paciente/PortadaPaciente.tsx:6
// ORDEN DE LECTURA, que es la decisión de diseño de verdad. La pantalla
// responde a cuatro preguntas, en el orden en que se las hace un paciente:
//   1. ¿Qué tengo que hacer hoy?   → el bloque grande, con el anillo y el botón
//   2. ¿Cómo voy?                  → racha y semana
//   3. ¿Qué viene?                 → próxima cita
//   4. ¿Y cómo me encuentro?       → check-in y evolución del dolor
// Nada de tarjetas de estadísticas arriba: eso es un panel de gestión, no el
// sitio donde alguien con dolor entra a ver qué le toca.
```

Es la diferencia entre un dashboard y una app de acompañamiento. Un dashboard
abre con métricas porque su usuario quiere *analizar*. Un paciente con dolor
cervical abre la app para saber **qué le toca hoy**, y eso tiene que ser lo
primero y lo más grande de la pantalla.

### 3.8 · Marcar un ejercicio sin que se note la red

```tsx
// components/paciente/PortadaPaciente.tsx:88
const marcarHecho = async (e: EjercicioGuia): Promise<boolean> => {
  const k = `${e.id}|${hoy}`
  if (checks.has(k)) return true
  setChecks((prev) => new Set(prev).add(k))          // 1. pinta YA
  try {
    const { data, error } = await supabase.rpc('mi_marcar_ejercicio', {
      p_ejercicio_id: e.id, p_hecho: true,
    })
    if (error || !data?.ok) throw new Error()        // 2. confirma
    return true
  } catch {
    setChecks((prev) => {                            // 3. deshace
      const s = new Set(prev); s.delete(k); return s
    })
    return false
  }
}
```

Esto se llama **actualización optimista**. El orden importa: se pinta el check
*antes* de hablar con el servidor, y solo se deshace si el servidor dice que no.

El motivo es el contexto de uso: alguien haciendo ejercicios en el suelo del
salón, con el móvil apoyado en una silla, quizá con mala cobertura. Si el check
tarda 800 ms en aparecer, la app se siente rota y deja de usarla. Así se siente
instantánea, y en el caso raro del fallo el check desaparece y puede volver a
tocarlo.

### 3.9 · Animación de scroll a 0 KB

Aquí se descartó la opción "profesional" a propósito:

```tsx
// components/paciente/Revelar.tsx:6
// POR QUÉ ASÍ Y NO CON UNA LIBRERÍA: esto es un IntersectionObserver del
// navegador y dos clases CSS. Cuesta 0 KB. Traer GSAP/ScrollTrigger para hacer
// aparecer una tarjeta sería pagar 50-70 KB en la primera pantalla que abre un
// paciente desde un enlace de WhatsApp con 4G.
```

El componente entero, sin **una sola línea de estado de React**:

```tsx
// components/paciente/Revelar.tsx:34
const ref = useCallback((el: HTMLElement | null) => {
  if (!el) return

  // Quien pide menos movimiento lo ve directamente: ni clase ni observador.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  el.style.transitionDelay = `${orden * 70}ms`   // escalona hermanos
  el.classList.add('revelar')                    // lo oculta

  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      el.classList.add('dentro')                 // lo revela
      obs.disconnect()                           // una sola vez
    }
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' })

  obs.observe(el)
  return () => obs.disconnect()   // React 19 admite limpieza desde un ref
}, [orden])
```

Tres detalles que no son evidentes:

**El `rootMargin` negativo abajo** (`-12%`) hace que el bloque se revele cuando
ha entrado de verdad en pantalla, no cuando asoma un píxel por el borde. Sin
eso, todo aparece antes de que lo estés mirando y la animación no se llega a
ver.

**El `disconnect()`** hace que se revele una sola vez. Si vuelves a subir y
bajar, el bloque no reaparece: eso marea y distrae.

**Y lo más importante — no hay estado de React:**

```tsx
// components/paciente/Revelar.tsx:11
// POR QUÉ SIN ESTADO DE REACT: la clase se pone y se quita sobre el nodo desde
// un ref callback. Dos ventajas sobre useState + useEffect:
//   · No hay setState dentro de un efecto, que con reactCompiler activado es
//     error de lint y además encadena renders.
//   · El HTML que manda el servidor NO lleva la clase que oculta. Si el JS no
//     llega a ejecutarse, el contenido se ve; con la clase puesta desde el
//     servidor, un fallo de hidratación dejaría la página en blanco.
```

Ese segundo punto es el que de verdad importa. Con la clase puesta desde el
servidor, **si el JavaScript falla la página se queda en blanco**. Con este
diseño, si el JavaScript falla lo único que se pierde es la animación: el
paciente sigue viendo su plan.

### 3.10 · El bundle: lo que aprendí equivocándome

Escribí que renderizar `<SesionGuiada/>` condicionalmente evitaba pagar el coste
de `motion`. **Era falso.** Un `import` estático se empaqueta y se descarga
siempre, se renderice el componente o no. `if (abierto)` no es code-splitting:
es decidir si pintas algo que ya te has descargado.

Lo que sí parte el bundle:

```tsx
// components/paciente/PortadaPaciente.tsx:31
// Igual que en la guía: la sesión es la única pantalla con `motion` y no debe
// pesar en la carga de la portada.
const SesionGuiada = dynamic(
  () => import('@/components/paciente/SesionGuiada').then((m) => m.SesionGuiada),
  { ssr: false },
)
```

`motion` se descarga la primera vez que el paciente pulsa "Empezar mi sesión",
no al abrir la portada. Verificado mirando los 13 scripts iniciales de `/mi`:
`motion` no está en ninguno.

---

## 4. Las decisiones, en una tabla

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Columna nueva `auth_user_id` | Reutilizar `pacientes.user_id` | `user_id` es el fisio dueño; reutilizarla rompe policies |
| Lista blanca de columnas | `to_jsonb(fila) - 'columna'` | La resta publica sola cualquier columna futura |
| Cero policies nuevas para el paciente | RLS a medida por paciente | Sin fila en `perfiles` ya ve 0 filas en las 15 tablas; añadir policies solo abriría superficie |
| Doble factor (token **y** email) | Vincular solo con el token | Token = un informe; cuenta = todo el historial. Sería escalada |
| `mi_*` gemelas de `guia_*` | Publicar el token en la app | El token es una credencial; una app con sesión no debe cargar con ella |
| IntersectionObserver | GSAP + ScrollTrigger | 50-70 KB en la primera pantalla, con 4G, para una aparición |
| Sin estado en `Revelar` | `useState` + `useEffect` | Error de lint con reactCompiler, y un fallo de hidratación dejaría la página en blanco |
| `next/dynamic` para la sesión | Render condicional | El render condicional NO parte el bundle |
| Server Component en `/mi` | Fetch tras hidratar | Los datos llegan pintados; el móvil no espera dos viajes |

---

## 5. Trampas

**Ves la página del paciente en blanco.** Mira si `Revelar` está poniendo la
clase que oculta desde el servidor. Debe ponerla el navegador, nunca el HTML
inicial.

**Bucle infinito al entrar desde el correo.** `/mi/callback` se ha caído de las
excepciones. Tiene que estar en `RUTAS_PACIENTE_PUBLICAS` (`proxy.ts:36`).

**El paciente ve su plan pero no puede marcar nada.** Está llamando a las
`guia_*` (que piden token) en vez de a las `mi_*` (que piden sesión).

**Un campo nuevo del informe no aparece en la app.** Es la lista blanca haciendo
su trabajo. Añádelo a mano en `guia_payload()`.

**El lint falla con `react-hooks/set-state-in-effect`.** Con `reactCompiler`
activado esto es **error, no aviso**. Un `setState` en el cuerpo de un
`useEffect` no compila: muévelo a un callback (de evento, de intervalo, de ref).

**El anillo de progreso se ve negro.** Faltan las variables `--gold*` en
`globals.css`. Se usaban en 9 sitios sin estar definidas en ninguno; ya está
arreglado, pero conviene reconocer el síntoma.

**Editas `middleware.ts` y no pasa nada.** En Next.js 16 el archivo es
`proxy.ts`. `middleware.ts` sencillamente se ignora.

---

## 6. Compruébalo tú

**Que el paciente no puede tocar tablas.** Con la clave `anon`, cualquier
`select` a `informes`, `pacientes`, `citas`… devuelve `42501` (permiso
denegado). Son 15 tablas y 6 RPCs, todas verificadas el 02/09/2026.

**Que el token no viaja a la app.** Abre `/mi` con sesión, DevTools → Network →
`mi_plan`, y busca `token` en la respuesta. No está.

**Que el bundle no carga `motion` de entrada.** Abre `/mi`, Network filtrado por
JS. `motion` no aparece hasta que pulsas "Empezar mi sesión".

**Que la animación respeta las preferencias.** DevTools → Rendering →
*Emulate prefers-reduced-motion: reduce*. Los bloques aparecen ya visibles, sin
transición.

**Que el intruso no entra.** Inicia sesión con un correo distinto al de la ficha
y canjea un token válido: `paciente_vincular` devuelve `no_coincide`.

---

## Archivos de este bloque

```
supabase/migrations/
  20260902100000_paciente_identidad.sql                   identidad + lista blanca
  20260902110000_uso_ia_y_limites.sql                     limite de chat por clinica
  20260902160000_escrituras_paciente_por_identidad.sql    mi_marcar / mi_checkin

app/mi/
  page.tsx            portada (Server Component)
  entrar/             pedir enlace por correo
  callback/route.ts   canjear codigo -> vincular -> cookie

app/lib/paciente/
  tipos.ts        espejo exacto de la lista blanca
  fechas.ts       racha, semana, checks por fecha
  formato.ts      color EVA, miniaturas, descansos
  useWakeLock.ts  que no se apague la pantalla durante la sesion

components/paciente/
  PortadaPaciente.tsx   la cara de la app
  SesionGuiada.tsx      sesion paso a paso (carga diferida)
  Revelar.tsx           aparicion al hacer scroll, 0 KB
  Anillo.tsx  ·  SemanaChecks.tsx  ·  SparkDolor.tsx  ·  FormularioEntrar.tsx

proxy.ts                dos zonas, dos puertas
```
