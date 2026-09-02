# App del paciente — plan y decisiones

Documento vivo. Nace el 02/09/2026 con la Fase 0 (análisis) y la Fase 1A hechas.
El encargo original está en `PROMPT_APP_PACIENTE.md`.

## Por qué

Muchas clínicas ya tienen software de agenda. Casi ninguna ofrece
acompañamiento real al paciente entre sesiones. **Ese es el argumento de venta.**

No se parte de cero: `/r/[token]` + `components/guia/GuiaPaciente.tsx` ya es un
60 % de la app (anillo, racha, checklist, check-in de dolor, semana, sparkline,
FAQ, mapa muscular, chat copiloto). Lo que falta no es funcionalidad: es
**identidad y continuidad**. Hoy un token = un informe, así que el paciente no
puede ver sus otros episodios, sus citas ni su bono.

## Decisiones tomadas (02/09/2026)

| Decisión | Elegido | Por qué |
|---|---|---|
| Arquitectura móvil | **PWA ahora, Capacitor si hay cliente** | Instalable ya, cero tiendas, cero coste. Next 16 lo soporta de fábrica (`app/manifest.ts`). Capacitor sirve una build **estática**: el SSR de Next no viaja, así que la superficie del paciente se construye hablando por RPC/API para no cerrar esa puerta. Expo/RN descartado: duplicaría toda la UI. |
| Superficie | **App nueva en `/mi`; `/r/[token]` intacta** | El enlace por WhatsApp es el canal de entrada y un activo comercial. Lo común se extrae a `components/paciente/`. |
| Identidad | **Enlace mágico por email, token como puerta** | El paciente entra por su enlace de siempre y pulsa "guardar mi progreso". Doble factor: hace falta el token **y** el email de su ficha. |
| Animación | **CSS + IntersectionObserver, `motion` puntual** | `position:sticky` ya es pin animation y cuesta 0 KB. Lenis descartado: secuestra el scroll nativo justo donde vive el paciente. GSAP descartado: imperativo, pelea con `reactCompiler`, y 50-70 KB en la primera pantalla que llega por 4G. |

### Alcance funcional decidido (02/09/2026)

| Área | Decidido | Razón |
|---|---|---|
| **Citas** | Ve todas (próximas + historial) y puede **solicitar** cambio o cancelación; la clínica aprueba desde su agenda | Punto dulce comercial: el paciente siente control y la clínica no pierde el mando. Reservar directo se descartó: es donde las clínicas con agenda apretada rechazan el software. |
| **Bonos** | **Sesiones restantes + caducidad. Sin precios.** | Ver que se agota invita a renovar. Las cifras de dinero están restringidas a admin dentro de RuDaMi; exponerlas al paciente contradiría esa decisión, y los precios varían por paciente. |
| **Comunicación** | Botón **WhatsApp** (`wa.me`, ya existe) + **avisos unidireccionales** de la clínica | Sin bandeja de entrada: una clínica pequeña con mensajes sin responder da peor imagen que no tenerlos. La mensajería bidireccional queda para más adelante, si un cliente la pide. |

### Modelo de seguridad (la decisión que más ahorra)

**El paciente no tiene acceso directo a ninguna tabla.** Ni una policy de RLS
nueva. Todo pasa por RPCs `SECURITY DEFINER` con **lista blanca de columnas
enumerada a mano**.

El motivo es la historia del proyecto: dar acceso a tabla y recortarlo después
es donde Postgres miente en silencio (el `revoke` por columnas de agosto, el
`to_jsonb(i) - 'notas_fisio'`). Si el paciente nunca tiene el `select`, no hay
nada que recortar. Efecto secundario: la app queda hablando solo por RPC, que es
justo lo que necesita para exportarse estática con Capacitor.

**Verificado en la base real el 02/09/2026**, no supuesto:
- `anon` → 42501 en las 15 tablas. No tiene ni un grant.
- `authenticated` sin fila en `perfiles` (= un paciente) → **0 filas en las 15 tablas**.
- `anon` llamando a `mi_plan`, `mi_resumen`, `paciente_actual`, `paciente_vincular`, `uso_ia_sumar`, `guia_payload` → 42501 en las 6.
- Intruso con un token real robado pero otro email → `no_coincide`.
- Paciente vinculado → `mi_resumen()` y `mi_plan()` devuelven lo suyo y solo lo suyo.

## Estrategia de tramo gratuito

Todo gratis hoy, con un punto de conmutación por dependencia para cuando llegue
un cliente con volumen.

**Techos medidos (02/09/2026, cabeceras `x-ratelimit` de la API real):**
Groq `gpt-oss-20b` → **1.000 peticiones/día** y **8.000 tokens/minuto**.
Estimación de una clínica activa ≈ 490 llamadas/día: **cabe una, dos no**.
Ojo: el asistente gasta **hasta 5 llamadas por mensaje** (bucle de function-calling).

| Dependencia | Hoy | Punto de conmutación |
|---|---|---|
| IA | Groq gpt-oss-20b | `app/lib/ai/groq.ts` (interfaz `AIProvider`) |
| Base de datos | Supabase Free | Las RPCs son la única superficie |
| Hosting | Vercel Hobby | — |
| Email | pendiente (Resend) | `app/lib/email/` cuando haya remitente real |
| GIFs de ejercicios | pendiente | `app/lib/media/` cuando la UI los pinte |

**Dos avisos que no son técnicos:**
1. Supabase Free **pausa el proyecto tras ~7 días sin actividad**. Mitigado con
   `.github/workflows/keepalive-supabase.yml` (una consulta diaria).
2. **Vercel Hobby prohíbe el uso comercial.** El día que una clínica firme hay
   que pasar a Pro (20 $/mes) y probablemente Supabase Pro (25 $/mes), este por
   los backups point-in-time que exige tener historias clínicas reales.

## Fases

- **Fase 0 — Análisis.** ✅ 02/09/2026
- **Fase 1A — Fundaciones.** ✅ 02/09/2026 (ver abajo)
- **Fase 1B — Login del paciente.** ✅ Código hecho 02/09/2026; falta la
  configuración de Supabase y una prueba con correo real.
  **Pendiente de verificación:** medir con un usuario de paciente REAL que ve 0
  filas por lectura directa. En 1A no se pudo (la FK a `auth.users` no admite
  uuids inventados y los únicos usuarios reales son fisios, que sí ven sus datos).

  ### Configuración necesaria en Supabase para la 1B

  **Authentication → URL Configuration:**
  - *Site URL*: `https://rudami-project.vercel.app`
  - *Redirect URLs*, añadir las dos:
    - `https://rudami-project.vercel.app/mi/callback**`
    - `http://localhost:3000/mi/callback**`

  El patrón importa: el enlace vuelve con `?t=<token>`, y según la documentación
  de Supabase los separadores son `.` y `/`, así que `*` ya cubriría el token
  hexadecimal; se usa `**` por robustez, y el prefijo de ruta es fijo y estrecho.

  **Authentication → SMTP Settings:** el remitente propio de Supabase solo manda
  2-4 correos/hora y solo a direcciones del equipo — vale para desarrollar y para
  una demo controlada, pero hay que pasar a **Resend** antes de que se registren
  pacientes reales.
- **Fase 2 — La experiencia.** 🚧 En curso.
  - ✅ **Sesión guiada** (`components/paciente/SesionGuiada.tsx`), accesible desde
    `/r/[token]` — a propósito: llega al enlace que ya se usa en demos, sin
    esperar a que nadie se registre.
  - ⏳ Pendiente: scroll triggers y secciones `sticky` en la guía, portada de
    `/mi` con diseño real, ilustraciones SVG de los 8 ejercicios sin foto.
  - ⚠️ **Sin verificación visual**: la extensión de Chrome no estaba conectada.
    Comprobado estructuralmente (botón, CSS servido, chunk aparte), no en pantalla.

  **Decisiones de la sesión guiada:**
  - *"Una cosa cada vez"*: desaparece todo menos el ejercicio de ahora. Una
    hairline dorada de progreso, la media, el nombre y **una** acción a la
    altura del pulgar. El único adorno es el contador en Newsreader itálica,
    que convierte la pantalla en ritual y no en formulario.
  - **Wake lock**: la pantalla no se apaga mientras dura la sesión, y se libera
    al salir. Sin esto el móvil se bloquea entre series y hay que buscar dónde
    ibas cada dos minutos.
  - **Descanso por reloj, no por ticks**: se cuenta contra un instante futuro
    porque el móvil ralentiza los temporizadores en segundo plano y contando
    ticks el descanso se alargaría solo.
  - **`next/dynamic` con `ssr:false`**: es la única pantalla que usa `motion`, y
    con un import normal viajaría en el bundle de la guía aunque nadie la abra.
    Verificado: `motion` **no** aparece en los 13 scripts iniciales.
  - `segundosDeDescanso()` se queda con el primer número de un rango (el extremo
    corto) y devuelve null si no reconoce nada: mejor sin cronómetro que con uno
    inventado.
- **Fase 3 — Progreso y evolución.** Historial por episodios, heatmap.
- **Fase 4 — Citas, bonos y comunicación.** Alcance decidido (ver tabla arriba):
  citas con solicitud de cambio, bono sin precios, WhatsApp + avisos.
- **Fase 5 — Endurecer.** Service worker y plan de hoy offline.
- **Fase 6 — Capacitor.** Solo si un cliente lo paga.

## openGym

Repo dado: `arvids-unavailable/openGym`, fork de **`DuarteSantos8/openGym`**.
Tracker de gimnasio autoalojado. Vite + React 19 + zustand + **Capacitor 7**, en
JavaScript. 919 líneas de CSS y **cero librerías de animación**.

⚠️ **Licencia AGPL-3.0.** Se dispara por uso en red. Copiar su código obligaría a
publicar el fuente de RuDaMi bajo AGPL: incompatible con un SaaS cerrado.
**Se usa como referencia de UX, nunca como fuente de código.**

Lo aprovechable:
- El patrón **Capacitor** para la Fase 6.
- El **guided workout**: llevar al paciente de la mano ejercicio a ejercicio con
  temporizador, en vez de darle una lista. Es el mejor hallazgo del análisis.
- Del dataset `hasaneyldrm/exercises-dataset`, **solo el texto**: los nombres e
  **instrucciones en español** de 1.324 ejercicios son MIT limpio y sirven para
  enriquecer la biblioteca.
- Su `BodyMap.jsx` **no** se coge: `MapaMuscular.tsx` es propio y encaja con v3.

⚠️ **Los GIFs y las imágenes de ese dataset NO se pueden usar.** Verificado en su
`LICENSE` el 02/09/2026: la MIT cubre *solo* código, estructura e instrucciones.
La media es **© Gym Visual**, incluida allí con permiso escrito concedido a ese
autor, y el texto es explícito: *"Cloning this repository does not grant you any
license to the media; obtain your own from Gym visual."* Meterla en un SaaS que
se vende a clínicas sería usar material comercial ajeno sin licencia. Las
capturas y el banner del propio openGym son AGPL, así que tampoco.

**Consecuencia práctica: la Fase 2 no necesita ninguna imagen nueva.** El
lenguaje v3 es editorial y tipográfico; meterle fotos de stock lo abarataría.
36 de los 44 ejercicios ya traen media propia (Free Exercise DB, dominio
público). Para los **8 sin foto** (cervicales, que ninguna base de gimnasio
cubre) el plan es **dibujarlos como SVG de línea en estilo v3**, igual que
`MapaMuscular.tsx`: gratis, propio y más coherente que una foto de gimnasio.

## Fase 1A — qué se hizo

**Base de datos** (`supabase/migrations/2026090210*` y `2026090211*`, aplicadas):
- `pacientes.auth_user_id` — columna nueva. `user_id` **no servía**: es el fisio
  propietario (verificado, 22/22 apuntan a un perfil).
- `paciente_actual()`, `paciente_vincular(token)`.
- `guia_payload(informe)` — constructor único, lista blanca. Lo comparten
  `informe_publico()` y `mi_plan()`, así que solo hay un sitio que decida qué se
  publica. Ya **no viajan** `token`, `paciente_id`, `episodio_id`, `sesion_id`,
  `clinica_id`, `fisio_id` ni `notas_fisio`.
- Ventana de checks/check-ins de 28 → **90 días** (la vista de evolución la necesita).
- `mi_plan()`, `mi_resumen()`.
- `uso_ia` + `clinicas.limite_chat_dia` (antes cableado a 12 dentro de la RPC).

**Código:**
- `app/lib/paciente/{tipos,fechas,formato}.ts` — espejo exacto de la lista blanca.
- `components/paciente/{Anillo,SparkDolor,SemanaChecks}.tsx` — extraídos de la guía.
- `GuiaPaciente.tsx` 578 → 505 líneas, mismo render exacto.
- `/mi`, `/mi/entrar`, `app/manifest.ts`.
- `proxy.ts`: dos zonas con puertas distintas. La cookie `rudami-rol` es **pista
  de enrutado, nunca de autorización** (el proxy no debe consultar la base).
- Contador de IA conectado a `/api/generar-informe` y `/api/asistente`.

**Verificación:** `tsc` limpio · ESLint 178 → **177** (ninguno nuevo) · build OK ·
guía publicada renderizada byte a byte igual (6 ejercicios, FAQ, métricas,
mapa muscular) · `/mi` → 307 a `/mi/entrar` · `/dashboard` sigue protegido.

**Deliberadamente NO hecho:** `app/lib/email/` y `app/lib/media/`. Se prometieron
en la 1A, pero no tienen consumidor todavía y crear abstracciones vacías es justo
la "capa de indirección inútil" que se decidió evitar. Llegan con su primer uso
real (Fase 2 y Fase 4). El enlace mágico **no** los necesita: lo envía Supabase
con su configuración SMTP, no código nuestro.

## Fase 1B — qué se hizo

- `components/paciente/FormularioEntrar.tsx` — cliente **a propósito**:
  `@supabase/ssr` usa PKCE (verificado: `flowType:'pkce'` por defecto en los dos
  clientes) y el *code verifier* tiene que escribirlo el navegador para que
  `/mi/callback` pueda canjearlo después.
- `app/mi/callback/route.ts` — `exchangeCodeForSession` → `paciente_vincular` →
  cookie de rol → `/mi`. Si la vinculación falla, **cierra la sesión**: mejor eso
  que dejar al paciente con cuenta y sin datos.
- `app/mi/entrar/page.tsx` — dos caras: "guarda tu progreso" si trae `?t=token`,
  login normal si no.
- La pantalla **nunca dice si un correo existe**: siempre "revisa tu correo".
  Decirlo la convertiría en un comprobador de quién es paciente de esa clínica.
- Cinta "Guarda tu progreso" en `/r/[token]`, **después** del plan y no antes:
  ningún muro en la puerta.
- `/api/logout` acepta `?next=`, saneado contra redirección abierta (`//host` y
  `/\host` incluidos, que los navegadores tratan como absolutos), y borra la
  cookie de rol.
- `/mi/callback` añadido a las rutas públicas de `proxy.ts`: protegerla sería un
  bucle, porque quien llega aún no tiene la sesión que viene a obtener.

### Fallo encontrado de camino: la capa "gold" no existía

`--gold`, `--gold-d` y `--gold-bg` se usaban en **9 sitios** (el arco del anillo,
la píldora de racha, los puntos de la semana, la nota del fisio) y **no estaban
definidos en ninguna parte**. Una variable CSS indefinida invalida la propiedad
entera, así que el arco del anillo se pintaba negro y las píldoras salían sin
fondo: la "capa premium gold" del brief no se estaba renderizando.

Confirmado contra el CSS **en vivo** de producción: usa los tres, no define
ninguno. Definida ahora como bronce editorial apagado (`#c8952a` / `#8a6414` /
`#fdf8ec`), con su variante para modo oscuro. Barrido el resto del proyecto: las
otras tres variables sin definir (`--fc`, `--ec`, `--cols`) son correctas, se
inyectan por elemento desde el TSX.
