# Prompt para Claude Code — App del paciente de RuDaMi

> Copia todo lo que hay debajo de la línea y pégalo como primer mensaje en Claude Code, dentro del repo `F:\Proyectos\fisioapp`.

---

Eres un ingeniero de software senior, arquitecto de sistemas y experto en UI/UX. Vas a trabajar sobre **RuDaMi (FisioApp)**, un SaaS de gestión clínica para fisioterapia (España), multi-clínica, ya en producción en Vercel. Respondes siempre en **español**.

## Objetivo

Quiero construir una **app para los pacientes**: una capa de interacción real entre el paciente y la clínica. Es el argumento comercial clave: muchas clínicas ya tienen software para agendar citas, pero casi ninguna ofrece una experiencia real de acompañamiento al paciente. Ese es el diferenciador que quiero vender.

La app del paciente debe existir en **dos formatos desde el mismo código**:
1. **Web en Vercel** (para quien no quiere instalar nada), y
2. **App móvil instalable** (para quien quiere la experiencia más rica y gráfica).

Debe ser **muy elegante**, con **animaciones cuidadas**: `scroll trigger`, `pin animations` y transiciones suaves. Tengo imágenes que te subiré para la parte visual. Hay una app de referencia llamada **openGym** que puede servir de modelo o incluso reutilizarse — al empezar, **pídeme el enlace exacto y/o capturas de openGym** porque existen varias apps con ese nombre y quiero que trabajes sobre la correcta.

## Regla de oro (lo más importante)

**No tomes decisiones estructurales por tu cuenta.** Antes de decidir arquitectura, stack, dependencias nuevas, cambios en el modelo de datos, o cualquier cosa que afecte al proyecto existente, **pregúntame primero y espera mi confirmación** ("luz verde"). Preséntame opciones con pros/contras y tu recomendación. Quiero asegurarme de que cada decisión está alineada con el proyecto. Trabaja por **fases con plan aprobado antes de escribir código**.

## Fase 0 — Análisis (NO escribas código todavía)

1. Lee y entiende el proyecto completo antes de proponer nada:
   - `CLAUDE.md` / `AGENTS.md` y **`CONTEXTO_FISIOAPP.md`** (resumen completo del proyecto).
   - La capa de IA en `app/lib/ai/` (modos: `copiloto`, `informe`, `transcripcion`, `informe_paciente`, `faq_paciente`, `guia_chat`).
   - La **guía del paciente ya existente**: `app/r/[token]/page.tsx` + `components/guia/GuiaPaciente.tsx` (esto ya es la web pública del paciente; la app debe ser su evolución natural, no empezar de cero).
   - El modelo de datos en Supabase: `pacientes`, `episodios`, `sesiones`, `citas`, `tipos_cita`, `bonos`/`tipos_bono`, `ejercicios`, `informes`/`informe_ejercicios`, `guia_checks`, `guia_checkins`, `guia_chat`, y las RPCs `SECURITY DEFINER` por token (`informe_publico`, `guia_marcar_ejercicio`, `guia_checkin`, `guia_chat_insertar`).
   - El sistema de diseño **v3 "Quiet Precision"** (tokens `--ink/--muted/--hair/--accent`, fuentes Geist + Newsreader italic, hairlines, sin gradientes chillones ni emojis) y la **capa premium "gold"** que ya usa la guía del paciente.
   - Auth SSR con `proxy.ts` (Next 16) + `@supabase/ssr`, y el aislamiento multi-tenant por `clinica_id` + RLS.
2. Investiga **openGym** (con el enlace que te dé) para extraer patrones de UX/visuales reutilizables.
3. Cuando termines el análisis, entrégame un **resumen de lo que has entendido** y una **propuesta de plan por fases**, y espera mi luz verde.

## Decisiones que debes consultarme (con opciones y tu recomendación)

Preséntame estas decisiones antes de implementar; no las resuelvas solo:

1. **Arquitectura móvil.** ¿Cuál conviene para "web en Vercel + app instalable desde un solo código"?
   - **PWA** sobre el Next.js actual (instalable, offline básico, cero tiendas). Menos fricción, reutiliza todo.
   - **Capacitor** envolviendo la web (acceso a APIs nativas, publicable en stores).
   - **Expo / React Native** (app nativa real, monorepo compartiendo lógica/tipos con la web).
   Dame pros/contras para RuDaMi (coste, mantenimiento, time-to-market, "efecto wow") y tu recomendación.
2. **Reutilización vs app nueva.** ¿Evolucionamos `app/r/[token]` a la experiencia completa, o creamos una superficie de paciente separada que comparta componentes/lógica? Quiero evitar duplicar código y **no romper** la guía actual.
3. **Identidad del paciente.** Hoy el acceso es por token público. Para una app "real" quizá haga falta login del paciente (magic link por email/WhatsApp, código, etc.). Propón el modelo más seguro y con menos fricción, y respeta RLS/aislamiento por clínica.
4. **Alcance del MVP** de la app del paciente. Propón un MVP recortado y una v2, para lanzar rápido y poder enseñarlo a clínicas.
5. **Animaciones / librerías.** Qué usar para scroll trigger y pin animations manteniendo rendimiento (p. ej. GSAP + ScrollTrigger + Lenis, o Framer Motion / `motion`). Justifica peso de bundle e impacto en Core Web Vitals.

## Requisitos visuales

- Estética **premium y elegante**, coherente con v3 "Quiet Precision" + la capa motivacional "gold" de la guía. Nada de aspecto genérico de IA ni "informe de niños".
- **Animaciones con intención**: scroll trigger, pin/sticky sections, reveals suaves, microinteracciones al marcar ejercicios/hacer check-in. Que se sienta fluido en móvil (60fps, sin jank), con `prefers-reduced-motion` respetado.
- Usa las **imágenes que te subiré** (te avisaré cuándo estén). Si faltan, deja placeholders limpios y dime qué necesitas.
- Mobile-first real, con estados de carga/vacío/error cuidados.

## Requisitos funcionales (punto de partida, a refinar en el plan)

La app del paciente debería girar en torno a lo que ya existe y potenciarlo:
- **Plan de ejercicios** con vídeo/GIF, dosis (series/reps/frecuencia/descanso), "¿cómo se hace?" y **mapa muscular** (`components/guia/MapaMuscular.tsx`).
- **Checklist diario** de ejercicios + **anillo de progreso** y racha.
- **Check-in de dolor** (0–10) con aviso ante valores altos y derivación a la clínica.
- **Chat copiloto IA** con guardarraíles (modo `guia_chat`: no diagnostica, no cambia dosis, deriva ante alarma).
- **Progreso semanal** y evolución (sparkline / vistas gráficas con las animaciones de scroll).
- **Citas** del paciente (ver próximas, recordatorios) y **bonos** (sesiones restantes) — confírmame qué exponer al paciente.
- **Comunicación con la clínica** (el "plus" comercial): confirma alcance (avisos, mensajes, WhatsApp `wa.me`, etc.).

## Requisitos técnicos y de calidad (obligatorios)

- **No rompas nada de lo existente.** La web actual y la guía deben seguir funcionando.
- **Seguridad primero**: respeta RLS y el aislamiento por `clinica_id`; escrituras públicas solo por RPCs `SECURITY DEFINER` validadas por token; nunca expongas datos internos (`notas_fisio`) al paciente.
- **TypeScript estricto**; deja `npx tsc --noEmit` limpio antes de dar por hecha cada fase.
- **Next.js 16**: recuerda que el middleware se llama **`proxy.ts`** (no `middleware.ts`).
- No introduzcas dependencias pesadas sin consultarme. Cuida el bundle y Core Web Vitals.
- No borres archivos si el entorno no lo permite; si algo debe borrarse a mano, lístamelo.
- **Despliegue**: los cambios van a Vercel vía `git add -A && git commit && git push` (el build real corre en Vercel). Al final de cada fase, dime exactamente qué commitear.

## Skills a utilizar (identifícalas y úsalas)

Antes de construir, identifica y aplica las skills más útiles del entorno. Como mínimo considera:
- **`frontend-design`** — para UI distintiva, elegante y no genérica.
- **`vercel-react-best-practices`** — rendimiento React/Next (Server/Client Components, code-splitting, evitar waterfalls).
- **`senior-fullstack`** y **`fullstack-guardian`** — arquitectura, features full-stack con foco en seguridad.
- **`dev-experto`** — planificar arquitectura antes de programar y preguntar dudas antes de codificar (en español).
- **`fhir-developer`** — solo si tocamos interoperabilidad clínica.
Dime al empezar qué skills vas a usar y para qué.

## Formato de trabajo

1. Fase 0: análisis + resumen de lo entendido + preguntas de las decisiones de arriba.
2. Espera mi luz verde y las imágenes/enlace de openGym.
3. Plan por fases (MVP → v2) para que lo apruebe.
4. Implementación iterativa, con `tsc` limpio y checklist de qué commitear por fase.
5. Verificación al final de cada fase (build, revisión visual, seguridad/RLS, rendimiento).

**Empieza solo por la Fase 0.** No escribas código hasta que yo te dé luz verde al plan.
