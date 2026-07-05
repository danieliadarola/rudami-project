# RuDaMi (FisioApp) — Contexto completo

## Qué es
SaaS de gestión clínica para fisioterapia (España). **Multi-clínica** (multi-tenant) con aislamiento por `clinica_id` + RLS. El nombre viene de los socios/usuarios: **Ru**i, **Da**niel, **Mi**guel. No es producto de consumo: herramienta profesional de alta eficiencia. **El diferenciador es el copiloto clínico con IA** (los Cliniko/Jane gestionan agenda y cobro; RuDaMi razona el caso).

- Repo: `github.com/danieliadarola/rudami-project` · Local: `F:\Proyectos\fisioapp` · Deploy: Vercel (`rudami-project.vercel.app`).
- Versión actual: **0.9.x** (la v1.0 será cuando esté listo).
- Usuarios reales: Daniel Iadarola (admin, azul), Felipe Gil, Miguel Rodríguez, Rui Gomes (fisios).

## Stack
Next.js 16 (App Router) + TypeScript · Supabase (PostgreSQL + Auth + RLS) · **Groq** `llama-3.3-70b` (capa de IA desacoplada en `app/lib/ai/`, cambiable a un modelo médico) · FullCalendar · jsPDF · Vercel. Auth SSR real con **`proxy.ts`** (Next 16) + `@supabase/ssr`.

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
16 pacientes de ejemplo (`@ejemplo.rudami`) con escenarios variados; un informe de ejemplo publicado (Lucía Fernández).

## Pendiente / futuro
- **Endurecer RLS** de `perfiles` y `clinicas` (fuga multiclínica) antes de un 2º cliente.
- **Pagos**: Stripe (+Connect) con IVA por servicio (fisio exento / pilates 21%) y VeriFactu 2027.
- **WhatsApp automático** (API de pago) + recordatorios 24h.
- **Sync de GIFs** de ejercicios con MuscleWiki (tier gratis, necesita API key) o ExerciseDB.
- Limpieza (el sandbox no puede borrar archivos; hacerlo a mano): borrar `middleware.ts.disabled`; borrar la ruta legacy `app/pacientes/[id]/sesion/` (hoy es solo un redirect) y los componentes muertos de `app/components/`: `EpisodioCard.tsx`, `GraficaEVA.tsx`, `BotonEliminarPaciente.tsx`, `BotonEliminarCita.tsx`, `ListaPacientes.tsx`, `MenuPaciente.tsx` (nadie los importa; los vivos de esa carpeta son SesionCard, BotonPDF, BotonEliminarSesion y BotonCerrarEpisodio — ideal moverlos a `components/` en el futuro). Desplegar últimos commits.

## Notas de despliegue
Cambios locales → `git add -A && git commit -m "…" && git push` → Vercel construye solo. El build real corre en Vercel (el sandbox no puede). `tsc` limpio en todo el código fuente.
