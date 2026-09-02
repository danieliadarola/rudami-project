# RuDaMi (FisioApp) — Contexto completo

## Qué es
SaaS de gestión clínica para fisioterapia (España). **Multi-clínica** (multi-tenant) con aislamiento por `clinica_id` + RLS. El nombre viene de los socios/usuarios: **Ru**i, **Da**niel, **Mi**guel. No es producto de consumo: herramienta profesional de alta eficiencia. **El diferenciador es el copiloto clínico con IA** (los Cliniko/Jane gestionan agenda y cobro; RuDaMi razona el caso).

- Repo: `github.com/danieliadarola/rudami-project` · Local: `F:\Proyectos\fisioapp` · Deploy: Vercel (`rudami-project.vercel.app`).
- Versión actual: **0.9.x** (la v1.0 será cuando esté listo).
- Usuarios reales: Daniel Iadarola (admin, azul), Felipe Gil, Miguel Rodríguez, Rui Gomes (fisios).

## Stack
Next.js 16 (App Router) + TypeScript · Supabase (PostgreSQL + Auth + RLS) · **Groq** `openai/gpt-oss-20b` (tramo gratuito, con `reasoning_effort:low`; capa de IA desacoplada en `app/lib/ai/`, cambiable a un modelo médico). Groq retiró `llama-3.3-70b-versatile` el 16/08/2026 — el modelo activo vive en la constante `MODELO` de `app/lib/ai/groq.ts`, que comparte el asistente · FullCalendar · jsPDF · Vercel. Auth SSR real con **`proxy.ts`** (Next 16) + `@supabase/ssr`.

## Diseño
Sistema **v3 "Quiet Precision"**: blanco editorial, hairlines, tokens (`--ink/--muted/--hair/--accent`), fuentes **Geist** + **Newsreader** italic (saludos/nombres). Nada de gradientes chillones ni emojis. Tono ejecutivo/clínico.

## Modelo de datos (Supabase)
`clinicas` · `perfiles` (rol admin/fisio, color, numero_colegiado) · `pacientes` · `episodios` (estado activo/cerrado; varios activos en paralelo por paciente) · `sesiones` (tipo, dolor_eva + métricas movilidad/fuerza/rigidez/fatiga/sueno/adherencia, diagnostico_ia, red_flags…) · `citas` (tipo_id, estado) · `tipos_cita` (catálogo con color) · `bonos` + `tipos_bono` (catálogo por servicio) · `ejercicios` (biblioteca, imagen_url/gif_url/video_url) · `informes` (notas_fisio interno + metricas jsonb) + `informe_ejercicios` (video_url/nota por prescripción) — informe del paciente con lectura pública por token; informe clínico de lectura interna en `/informes/[id]/clinico`.

## Funcionalidades
- **Dashboard**: KPIs reales (pacientes activos, citas hoy, sesiones semana, altas mes), **banderas de alerta multifactor** (EVA sin mejora, cancelaciones, cronicidad, red flags). Versión resumida para el fisio.
- **Pacientes**: lista con filtros (Activos/De alta/Todos). **Ficha a 2 columnas**: historial de sesiones (desplegable) + sidebar (datos, próxima cita, bono). Episodios en paralelo (botón "Nueva consulta").
- **Sesión nueva (unificada)**: 3 modos en tarjetas (Primera/Seguimiento/Rápida), slider EVA, **indicadores de seguimiento** (movilidad, fuerza, rigidez, fatiga, sueño, adherencia — ocultos en modo Rápida), **copiloto IA en vivo** (hipótesis, banderas, preguntas accionables, alarma roja), **escriba por voz** (transcribe la conversación y rellena la ficha), informe clínico al guardar. Las métricas viajan directas al informe (`/informes/nuevo` ya las precarga desde `sesiones`).
- **Agenda**: FullCalendar reestilado v3, **tipos de cita con color** (catálogo), drag&drop reprogramar, panel lateral, alta con tipo. Botón **"Avisar por WhatsApp"** (wa.me, gratis).
- **Asistente conversacional** (buscador de la topbar): chat **texto + voz** que agenda/cancela/crea pacientes/da de alta/consulta por lenguaje natural (function-calling). Acciones destructivas con confirmación.
- **Bonos**: catálogo por servicio que **diseña el admin** (`/configuracion/tipos-bono`); los **fisios solo añaden** del catálogo. Tarjetas con anillo+puntos (azul, se rellenan al usar). KPIs accionables (Por caducar / Por agotarse) clicables. Cifras de dinero **solo admin** (ingresos por fisio, filtrables).
- **Guía del Paciente interactiva** (evolución del Informe Inteligente) — dos salidas desde el mismo registro: **guía del paciente** (`/r/[token]`, pública, componente `components/guia/GuiaPaciente.tsx`) e **informe clínico** (`/informes/[id]/clinico`, interno, técnico; PDF con `window.print()`). La guía ya no es un informe estático, es acompañamiento entre sesiones: **anillo de progreso diario** + racha de días, **checklist por ejercicio** ("Marcar como hecho", optimista con revert), **check-in diario de dolor** (slider 0-10, aviso si ≥8), tarjetas de ejercicio con media normalizada (16/10 cover, vídeo YouTube lazy con thumbnail, numeradas), dosis en píldoras (series/reps/frecuencia/descanso), desplegable "¿Cómo se hace?" (instrucciones + evita/consejo + explicación IA), **progreso semanal L-D** + sparkline de dolor reportado (SVG puro), **FAQ pregenerada** en acordeón y **chat copiloto IA** (bottom sheet, 12 preguntas/día). Flujo fisio: ficha ("✦ Informe") → editor `/informes/[id]` (genera con IA, sliders, frecuencia por ejercicio, notas internas) → **Publicar** genera además la FAQ con IA (modo `faq_paciente`) → compartir WhatsApp/email/PDF. Si está publicada, el editor muestra **"Actividad del paciente"**: adherencia 7d, días activos, dolor reportado vs sesión y últimas dudas del chat. Escrituras públicas SOLO por RPCs `SECURITY DEFINER` validadas por token: `guia_marcar_ejercicio`, `guia_checkin`, `guia_chat_insertar` (rate limit) + `informe_publico` ampliado (checks/checkins/chat/hoy; ya **no expone notas_fisio**). Tablas: `guia_checks`, `guia_checkins`, `guia_chat` (RLS: lectura interna por clínica, cero acceso directo público). El guardado de ejercicios del editor es **no destructivo** (update por id) para conservar los checks del paciente. Chat del paciente en `/api/guia` (modo IA `guia_chat` con guardarraíles: nunca diagnostica ni cambia dosis, deriva a la clínica ante señales de alarma).
- **Mapa muscular** (`components/guia/MapaMuscular.tsx` + `app/lib/musculos.ts`): silueta SVG propia (frontal + dorsal, 22 grupos) estilo v3; `normalizarMusculos()` convierte el texto libre `musculos` (es/en) en grupos del catálogo — cubre el 100% de la biblioteca actual. En la guía del paciente: mini-mapa en la tarjeta + mapa completo con leyenda ("Deberías notarlo aquí") dentro de "¿Cómo se hace?". En la biblioteca (admin): preview en vivo del mapa según se escribe el campo Músculos, con aviso si no se reconoce ningún grupo.
- **Biblioteca de ejercicios** (`/configuracion/ejercicios`, admin): 44 ejercicios (10 originales en español + 34 importados de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), dominio público/Unlicense, con foto real), buscador + filtro por zona, campos imagen/GIF/vídeo(YouTube) independientes. 8 ejercicios (sobre todo cervicales) siguen sin foto — esa base es de gimnasio y cubre poco la zona cervical; pendiente añadir manualmente o generar ilustraciones.

## IA (capa `app/lib/ai/`)
Proveedor Groq, swappable. Modos: `copiloto`, `informe`/`informe_rapido`, `transcripcion` (escriba), `informe_paciente`, `faq_paciente` (dudas anticipadas al publicar la guía) y `guia_chat` (copiloto del paciente, respuestas cortas con guardarraíles clínicos). Asistente con function-calling en `app/lib/ai/asistente.ts` + `/api/asistente`. Chat del paciente en `/api/guia`.

## Roles
- **Admin** (dueño): ve todo, diseña catálogos (tipos de cita, bonos, ejercicios), ve ingresos/desgloses por fisio.
- **Fisio**: su propio dashboard resumido, sus pacientes (RLS), vende/añade del catálogo, sin cifras de negocio.

## Datos demo
16 pacientes de ejemplo (`@ejemplo.rudami`) con escenarios variados; un informe de ejemplo publicado (Lucía Fernández). **Todos los pacientes y sesiones de la base son inventados** (confirmado 28/08/2026): no hay historia clínica real, lo que abarata mucho tocar RLS o migrar datos. Los 4 perfiles sí son personas reales (los socios).

## Estado a 02/09/2026 — arranca la app del paciente

Línea de trabajo nueva y grande: **la app del paciente** (`/mi`), que es el
argumento comercial frente a los Cliniko/Jane. Plan completo, decisiones y
verificaciones en **`PLAN_APP_PACIENTE.md`**; el encargo, en `PROMPT_APP_PACIENTE.md`.

Hecha la **Fase 0** (análisis) y la **Fase 1A** (fundaciones). Titulares:

- **El paciente no tendrá acceso directo a ninguna tabla.** Ni una policy nueva:
  todo por RPCs `SECURITY DEFINER` con lista blanca enumerada a mano. Medido, no
  supuesto: un `authenticated` sin fila en `perfiles` ve **0 filas en las 15 tablas**.
- **`informe_publico` pasa de lista negra a lista blanca.** Antes era
  `to_jsonb(i) - 'notas_fisio'`, así que publicaba el token, los ids internos y
  **cualquier columna que se añadiese a `informes` en el futuro**. Ahora las
  columnas se escriben a mano en `guia_payload()`, que comparten la guía por
  enlace y la app. Ventana de checks/check-ins: 28 → 90 días.
- **`pacientes.auth_user_id`** es columna nueva. `user_id` **no servía**: es el
  fisio propietario de la ficha (22/22 apuntan a un perfil).
- **Vinculación con doble factor**: hace falta el token **y** el email de la
  ficha. Solo con el token sería escalada (token = un informe; cuenta = todo el
  historial). Verificado: intruso con token robado y otro email → `no_coincide`.
- **`proxy.ts` tiene ahora dos zonas** con puertas distintas (clínica → `/`,
  paciente → `/mi/entrar`). La cookie `rudami-rol` es **pista de enrutado, nunca
  de autorización**: el proxy no debe consultar la base.
- **Contador de consumo de IA** (`uso_ia`) y **límites configurables**
  (`clinicas.limite_chat_dia`, antes cableado a 12 dentro de la RPC).

**Techos del tramo gratuito, medidos el 02/09** (cabeceras `x-ratelimit` reales):
Groq `gpt-oss-20b` da **1.000 peticiones/día** y **8.000 tokens/minuto**. Una
clínica activa ≈ 490/día: **cabe una, dos no**. El asistente gasta **hasta 5
llamadas por mensaje** (bucle de function-calling), que es lo que más pesa.

**Dos avisos que no son de ingeniería:** Supabase Free **pausa el proyecto a los
~7 días sin actividad** (mitigado con `.github/workflows/keepalive-supabase.yml`)
y **Vercel Hobby prohíbe el uso comercial** — el día que firme una clínica, Pro.

## Estado a 28/08/2026

**Resuelto en esa sesión:**
- **La IA estaba caída en producción desde el 16/08** — Groq retiró `llama-3.3-70b-versatile` (aviso del 17/06) y todo lo que dependía de IA devolvía 404: copiloto, escriba, informes, FAQ y asistente. Migrado a `openai/gpt-oss-20b` (tramo gratuito) con `reasoning_effort:'low'` **obligatorio** (sin él el razonamiento se come `max_tokens`, la respuesta llega truncada y revienta el `JSON.parse`). Desplegado y verificado.
- **`/api/generar-informe` no pedía sesión**: era un proxy de IA abierto contra la cuota de Groq. Ahora 401 sin sesión (verificado).
- **Escalada de privilegios en `perfiles`**: cualquier fisio podía hacer `update perfiles set rol='admin'` desde la consola del navegador y, cambiando `clinica_id`, saltar a otra clínica. Cerrado y verificado con el ataque real (`42501 permission denied`), comprobando además que un cambio legítimo sigue pasando.
- **Fuga multiclínica** de `perfiles`/`clinicas` (ambas con `USING (true)`): acotadas a la clínica propia vía `clinica_actual()`.
- **`/configuracion` no estaba en `RUTAS_PROTEGIDAS`**: los subpaneles respondían 200 sin sesión.
- **Versionado del esquema arrancado** en `supabase/migrations/`.
- Retirado el generador de imágenes (`gpt-image-1`): escribía con `fs.writeFile` en `public/`, que es de solo lectura en las funciones de Vercel, así que la URL devuelta habría dado 404 siempre.

**Trampa que costó dos intentos, para no repetirla:** en PostgreSQL, `revoke update (columna)` **no puede recortar un `UPDATE` concedido a nivel de tabla**, y Supabase concede `all` por defecto. No da error: el editor SQL dice "Success" y no cambia nada. Hay que `revoke update on <tabla>` y luego `grant update (columnas seguras)`. Verificar siempre con `has_column_privilege()`, nunca fiarse del mensaje del editor.

## Pendiente / futuro

**Bloqueado por credenciales (dos cosas, un solo trámite cada una):**
- **SMTP para la Fase 1B de la app del paciente.** El remitente por defecto de
  Supabase manda 2-3 correos/hora y solo a direcciones del equipo: no sirve ni
  para demos. Recomendado **Resend** (3.000/mes gratis). Sin esto no hay enlace
  mágico y `/mi/entrar` sigue siendo una pantalla informativa.
- **Secretos del keep-alive** en GitHub → Settings → Secrets → Actions:
  `SUPABASE_URL` y `SUPABASE_ANON_KEY` (esta es pública, ya va en el bundle).
  Sin ellos el workflow falla y el proyecto se puede pausar antes de una demo.

**Siguiente punto (plan acordado, a falta de la clave):**
- **El alta de fisios nunca ha funcionado.** Cinco fallos encadenados: (1) `perfiles` no tiene policy de INSERT, así que RLS bloquea el `upsert`; (2) el `upsert` escribe una columna `email` que no existe en la tabla; (3) `auth.signUp()` desde el navegador cambia la sesión del admin por la del fisio recién creado; (4) el `upsert` no comprueba el error y pinta "creado" pase lo que pase — por eso nadie se dio cuenta; (5) el admin teclea la contraseña de su compañero. Los 4 perfiles actuales se crearon a mano.
- **Plan**: endpoint `POST /api/admin/fisios` con `service_role` que (a) verifica que quien llama es admin, (b) toma el `clinica_id` del perfil del llamante y **nunca del body**, (c) crea el usuario con `auth.admin.createUser({ email_confirm: true })` desde el servidor, (d) inserta el perfil saltando RLS a propósito, (e) muestra errores reales, (f) asigna un color libre. Así **no hace falta añadir policy de INSERT** a `perfiles`.
- **BLOQUEADO POR**: falta `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en Vercel. Copiarla de Settings → API Keys. **Sin el prefijo `NEXT_PUBLIC_`**: con él acabaría en el bundle del navegador y expondría toda la base saltándose la RLS.

**Deuda de fondo (nada urgente, por orden de valor):**
- Sin tests ni CI. Vercel construye directo de `main`.
- 165 errores de ESLint (139 `no-explicit-any`, 13 `react-hooks/set-state-in-effect` — estos importan porque `reactCompiler` está activado).
- 21 de 27 páginas son `'use client'`; datos clínicos viajando por el cliente pudiendo ir por SSR.
- Cluster de 6 componentes muertos en `app/components/` (nadie entra desde fuera): `EpisodioCard` → `GraficaEVA`, `ListaPacientes` → `MenuPaciente`, `BotonEliminarPaciente`, `BotonEliminarCita`. Con ellos se va `recharts`. Sobran también `@react-pdf/renderer` (0 usos) y la ruta legacy `app/pacientes/[id]/sesion/`.
- Verificar las demos en pantalla: el copiloto en vivo y el asistente están probados por API, no visualmente. Tampoco se ha revisado visualmente el modo oscuro ni `/configuracion`.
- Miguel y Rui comparten color (`#f59e0b`) y la agenda distingue fisios por color.

**Producto / futuro:**
- **Pagos**: Stripe (+Connect) con IVA por servicio (fisio exento / pilates 21%) y VeriFactu 2027.
- **WhatsApp automático** (API de pago) + recordatorios 24h.
- **Sync de GIFs** de ejercicios con MuscleWiki (tier gratis, necesita API key) o ExerciseDB.
- Cuando haya SMTP configurado, pasar el alta de fisios a `inviteUserByEmail` para que el fisio se ponga su propia contraseña y el admin nunca la vea.

## Notas de despliegue
Cambios locales → `git add -A && git commit -m "…" && git push` → Vercel construye solo. El build real corre en Vercel (el sandbox no puede). `tsc` limpio en todo el código fuente.
